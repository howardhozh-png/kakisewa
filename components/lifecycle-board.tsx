"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import Image from "next/image";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Tenancy, LifecycleStage, defaultLifecycleStage, daysUntil, getBusinessToday } from "@/lib/types";
import { setLifecycleStage, buildExpiryPingOwner, buildExpiryPingTenant, lostContractAction, bulkRemoveTenancies } from "@/lib/actions";
import { TenancyDetailDialog } from "@/components/tenancy-detail-dialog";
import { ArrowRight, AlertTriangle, CheckCircle, CircleDashed, Check, Banknote, Lock, ChevronDown, MessageCircle, Loader2, ShieldAlert, User, Home, Calendar, Search, X as XIcon, Bed, Bath, ListChecks, Square, CheckSquare, Trash2 } from "lucide-react";
import { buildWhatsAppPingUrl } from "@/lib/whatsapp";
import { TenanciesTimeline } from "@/components/tenancies-timeline";
import { FeatureLockedState } from "@/components/feature-locked-state";
import { RenewalCommissionDialog } from "@/components/renewal-commission-dialog";
import { TenantLeavingDialog } from "@/components/tenant-leaving-dialog";
import { OwnerLeavingDialog } from "@/components/owner-leaving-dialog";
import { FilterSelect } from "@/components/filter-select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

interface ColMeta {
  stage: LifecycleStage | "expired";
  label: string;
  hint: string;
  dot: string;
  soft: string;
  ink: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const EXPIRED_COL: ColMeta = {
  stage: "expired",
  label: "Expired",
  hint: "Contract ended with no action. Choose what happened next.",
  dot: "#C62828",
  soft: "#FEF2F2",
  ink: "#C62828",
  Icon: AlertTriangle,
};

const COLUMNS: ColMeta[] = [
  { stage: "headsup",  label: "Expiring",  hint: "Expires soon. Use 'What's next?' on the card to choose the outcome.", dot: "var(--kk-theme-dark)", soft: "var(--kk-theme-light)", ink: "var(--kk-theme-dark)", Icon: AlertTriangle },
  { stage: "renewing", label: "Renewing",  hint: "1 month rent is counted as renewal income by default",                       dot: "var(--kk-green)",     soft: "var(--kk-green-soft)", ink: "#1F8B4C",            Icon: CheckCircle   },
  { stage: "active",   label: "Active",    hint: "Tenancy in good standing. Nothing due yet.",                           dot: "var(--kk-ink-faint)", soft: "var(--kk-surface-2)",  ink: "var(--kk-ink-mute)", Icon: CircleDashed  },
];

interface Props {
  tenancies: Tenancy[];
  openTenancyId?: string;
  highlightId?: string;
  plan?: string;
  totalCards?: number;
}

export function LifecycleBoard({ tenancies, openTenancyId, highlightId, plan = "platinum", totalCards }: Props) {
  const today = useMemo(() => getBusinessToday(), []);
  const router = useRouter();
  const ph = usePostHog();
  const [openTenancy, setOpenTenancy] = useState<Tenancy | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingTenancy, setDraggingTenancy] = useState<Tenancy | null>(null);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);

  const [commissionTenancy, setCommissionTenancy] = useState<Tenancy | null>(null);
  const [tenantLeavingTenancy, setTenantLeavingTenancy] = useState<Tenancy | null>(null);
  const [ownerLeavingTenancy, setOwnerLeavingTenancy] = useState<Tenancy | null>(null);
  const [lostTenancy, setLostTenancy] = useState<Tenancy | null>(null);
  const [pendingMove, setPendingMove] = useState<{ t: Tenancy; target: LifecycleStage } | null>(null);
  const UPGRADE_FROM: Record<string, { id: string; cap: number | null }> = {
    silver: { id: "gold", cap: 150 }, gold: { id: "platinum", cap: 400 }, platinum: { id: "elite", cap: null }, elite: { id: "elite", cap: null },
  };
  const [capBlocked, setCapBlocked] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, startBulkDelete] = useTransition();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    setConfirmBulkDelete(false);
    startBulkDelete(async () => {
      setLocal((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      await bulkRemoveTenancies(ids);
      exitSelectMode();
      router.refresh();
    });
  }

  const [local, setLocal] = useState<Tenancy[]>(tenancies);
  useEffect(() => { setLocal(tenancies); }, [tenancies]);

  const PLAN_CARD_CAP: Record<string, number> = { frozen: 0, silver: 50, gold: 150, platinum: 400, elite: 1000 };
  const planCap = PLAN_CARD_CAP[plan] ?? Infinity;
  const activeCardCount = useMemo(
    () => local.filter((t) => t.lifecycle_stage !== "closed" && defaultLifecycleStage(t, today) !== null).length,
    [local, today]
  );

  // Poll every 30s so renewal form responses appear without a manual refresh -
  // only while at least one tenancy is actively awaiting a reply (was previously
  // unconditional, running even with nothing to check). Paused while the tab
  // isn't visible, catches up immediately the moment it becomes visible again.
  useEffect(() => {
    const hasPendingResponse = local.some((t) => defaultLifecycleStage(t, today) === "headsup");
    if (!hasPendingResponse) return;

    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [local, today, router]);

  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (openTenancyId && !hasAutoOpened.current) {
      const t = tenancies.find((t) => t.id === openTenancyId);
      if (t) {
        setOpenTenancy(t);
        hasAutoOpened.current = true;
        router.replace("/existing-listing", { scroll: false });
      }
    }
  }, [openTenancyId, tenancies, router]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-card-id="${highlightId}"]`);
      if (!el) return;
      // scrollIntoView with block:"center" scrolls both the column body and the page
      // so the card lands in the middle of the viewport
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTimeout(() => {
        const el2 = document.querySelector<HTMLElement>(`[data-card-id="${highlightId}"]`);
        if (!el2) return;
        el2.style.removeProperty("box-shadow");
        el2.classList.add("kk-flash-green");
        setTimeout(() => el2.classList.remove("kk-flash-green"), 2100);
      }, 800);
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 2000, tolerance: 25 } }),
  );

  const propertyOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    local.forEach((t) => {
      if (!t.property_name) return;
      const n = normalizePropName(t.property_name);
      counts[n] = (counts[n] ?? 0) + 1;
    });
    return [
      { value: "all", label: "All properties" },
      ...Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([n, count]) => ({ value: n, label: `${n} (${count})` })),
    ];
  }, [local]);

  const byStage = useMemo(() => {
    const out: Record<LifecycleStage, Tenancy[]> = {
      active: [], stalled: [], headsup: [], pinged: [], renewing: [],
      pending_payment: [], replacing: [], ending: [], closed: [], reserved: [],
    };
    const q = search.toLowerCase().trim();
    local
      .filter((t) => propertyFilter === "all" || normalizePropName(t.property_name ?? "") === propertyFilter)
      .filter((t) => !monthFilter || t.contract_end?.slice(0, 7) === monthFilter)
      .filter((t) => !q || [t.property_name, t.tenant_name, t.property?.owner_name, t.property?.unit].some(f => f?.toLowerCase().includes(q)))
      .forEach((t) => {
        const stage = defaultLifecycleStage(t, today);
        if (!stage) return;
        if (stage === "closed" || stage === "reserved") return; // archived or pending move-in — not shown here
        // All non-primary stages show in Expiring column so every card linked from home is reachable
        const bucket: LifecycleStage = (stage === "pinged" || stage === "stalled" || stage === "ending" || stage === "replacing") ? "headsup" : stage;
        if (bucket in out) out[bucket].push(t);
      });
    Object.keys(out).forEach((k) => {
      out[k as LifecycleStage].sort((a, b) => (a.contract_end ?? "").localeCompare(b.contract_end ?? ""));
    });
    return out;
  }, [local, today, search, propertyFilter, monthFilter]);

  // Cards where the contract end date has already passed — split off from the headsup bucket
  const expiredCards = useMemo(
    () => byStage.headsup.filter((t) => t.contract_end && daysUntil(t.contract_end, today) < 0),
    [byStage.headsup, today]
  );
  const expiredIds = useMemo(() => new Set(expiredCards.map((t) => t.id)), [expiredCards]);

  function checkPlanCap(targetStage: LifecycleStage): boolean {
    if (!isFinite(planCap)) return false;
    const activeStages: LifecycleStage[] = ["active", "headsup", "renewing", "pinged", "stalled", "pending_payment"];
    if (!activeStages.includes(targetStage)) return false;
    return (totalCards ?? activeCardCount) >= planCap;
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    setDraggingTenancy(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const rawTarget = String(e.over.id);
    if (rawTarget === "expired") return; // expired column is not a drop target
    const target = rawTarget as LifecycleStage;
    const t = local.find((x) => x.id === id);
    if (!t) return;
    const from = defaultLifecycleStage(t, today);
    if (!from || from === target) return;
    if (checkPlanCap(target)) { setCapBlocked(true); return; }
    setPendingMove({ t, target });
  }

  async function confirmMove() {
    if (!pendingMove) return;
    const { t, target } = pendingMove;
    const fromStage = defaultLifecycleStage(t, today);
    setPendingMove(null);
    setLocal((prev) => prev.map((x) => (x.id === t.id ? optimisticApply(x, target) : x)));
    const res = await setLifecycleStage(t.id, target);
    if (res.ok) {
      track(ph, "pipeline_card_moved", { from_col: fromStage, to_col: target, type: "tenancy" });
      router.refresh();
    } else {
      setLocal(tenancies);
      toast.error(res.message);
    }
  }

  async function handleMoveToStage(id: string, target: LifecycleStage) {
    if (checkPlanCap(target)) { setCapBlocked(true); return; }
    setLocal((prev) => prev.map((x) => (x.id === id ? optimisticApply(x, target) : x)));
    const res = await setLifecycleStage(id, target);
    if (res.ok) {
      router.refresh();
    } else {
      setLocal(tenancies);
      toast.error(res.message);
    }
  }

  return (
    <>
      <div className="kk-section p-5 mb-5">
        <div className="mb-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>See your renewal income for each month, up to 24 months ahead</p>
        </div>
        <TenanciesTimeline
          tenancies={local.filter((t) => {
            if (propertyFilter !== "all" && normalizePropName(t.property_name ?? "") !== propertyFilter) return false;
            const s = defaultLifecycleStage(t, today);
            return s !== null && s !== "closed";
          })}
          selectedMonth={monthFilter}
          onMonthClick={(key) => setMonthFilter((prev) => prev === key ? "" : key)}
        />
      </div>

      <div ref={boardRef} style={{ scrollMarginTop: 80 }} />
      <DndContext
        id="kakisewa-lifecycle"
        sensors={sensors}
        onDragStart={(e) => {
          const id = String(e.active.id);
          setDraggingId(id);
          setDraggingTenancy(local.find((x) => x.id === id) ?? null);
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setDraggingId(null); setDraggingTenancy(null); }}
      >
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <div className="relative shrink-0 flex items-center">
            <Search className="absolute pointer-events-none" style={{ left: 12, width: 14, height: 14, color: "var(--kk-ink-faint)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="rounded-full outline-none"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", minWidth: 160, fontSize: 13, paddingLeft: 36, paddingRight: search ? 28 : 12, paddingTop: 6, paddingBottom: 6 }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5" style={{ color: "var(--kk-ink-faint)" }}>
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
          <FilterSelect
            value={propertyFilter}
            onChange={setPropertyFilter}
            options={propertyOptions}
            minWidth={160}
          />
          <button
            type="button"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="shrink-0 flex items-center gap-1.5 rounded-full text-[13px] font-medium"
            style={{
              padding: "6px 14px",
              background: selectMode ? "var(--kk-ink)" : "var(--kk-surface-2)",
              color: selectMode ? "#fff" : "var(--kk-ink-mute)",
              border: "1px solid var(--kk-line)",
            }}
          >
            <ListChecks className="w-3.5 h-3.5" />
            {selectMode ? "Done" : "Select"}
          </button>
        </div>

        {selectMode && (
          <div
            className="flex items-center gap-2.5 mb-4 rounded-xl px-3 py-2"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
          >
            <p className="flex-1 text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>
              {selectedIds.size === 0 ? "Tap cards to select" : `${selectedIds.size} selected`}
            </p>
            <button
              type="button"
              onClick={exitSelectMode}
              disabled={bulkDeleting}
              className="kk-pill kk-pill-ghost text-[12px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || bulkDeleting}
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: "#DC2626", color: "#fff", opacity: selectedIds.size === 0 ? 0.5 : 1 }}
            >
              <Trash2 className="w-3 h-3" />
              Delete {selectedIds.size > 0 ? selectedIds.size : ""}
            </button>
          </div>
        )}

        <div className="kk-board-shell -mx-3 lg:-mx-5">
          <div className="kk-board-row px-3 lg:px-5" style={{ overflowY: 'hidden' } as React.CSSProperties}>
            {/* Expired column — always visible; auto-populated when contract_end < today */}
            <Column col={EXPIRED_COL} count={expiredCards.length} extraStyle={{ flex: 1, minWidth: 300 }}>
              {expiredCards.length === 0
                ? <EmptyDrop col={EXPIRED_COL} />
                : expiredCards.map((t) => (
                    <Card
                      key={t.id}
                      t={t}
                      col={EXPIRED_COL}
                      today={today}
                      plan={plan}
                      isDragging={draggingId === t.id}
                      onOpen={() => setOpenTenancy(t)}
                      onShowCommission={() => setCommissionTenancy(t)}
                      onShowTenantLeaving={() => setTenantLeavingTenancy(t)}
                      onShowOwnerLeaving={() => setOwnerLeavingTenancy(t)}
                      onShowLostContract={() => setLostTenancy(t)}
                      onMoveToStage={handleMoveToStage}
                      selectMode={selectMode}
                      selected={selectedIds.has(t.id)}
                      onToggleSelect={() => toggleSelect(t.id)}
                    />
                  ))
              }
            </Column>

            {COLUMNS.map((col) => {
              const cards = col.stage === "headsup"
                ? byStage.headsup.filter((t) => !expiredIds.has(t.id))
                : byStage[col.stage as LifecycleStage];
              const columnContent = cards.length === 0 ? (
                <EmptyDrop col={col} />
              ) : (
                cards.map((t) => (
                  <Card
                    key={t.id}
                    t={t}
                    col={col}
                    today={today}
                    plan={plan}
                    isDragging={draggingId === t.id}
                    onOpen={() => setOpenTenancy(t)}
                    onShowCommission={() => setCommissionTenancy(t)}
                    onShowTenantLeaving={() => setTenantLeavingTenancy(t)}
                    onShowOwnerLeaving={() => setOwnerLeavingTenancy(t)}
                    onShowLostContract={() => setLostTenancy(t)}
                    onMoveToStage={handleMoveToStage}
                    selectMode={selectMode}
                    selected={selectedIds.has(t.id)}
                    onToggleSelect={() => toggleSelect(t.id)}
                  />
                ))
              );

              if (col.stage === "headsup") {
                return (
                  <div key={col.stage} style={{ position: "relative", flex: 2, minWidth: 380, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ position: "absolute", top: -50, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, background: "var(--kk-theme-dark)", borderRadius: 22, padding: "10px 20px", boxShadow: "0 4px 14px color-mix(in srgb, var(--kk-theme-dark) 30%, transparent), 0 1px 4px rgba(0,0,0,0.10)" }}>
                        <Banknote className="w-4 h-4" style={{ color: "#fff" }} />
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Don&apos;t forget your money!</span>
                        <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid var(--kk-theme-dark)" }} />
                      </div>
                    </div>
                    <Column col={col} count={cards.length} extraStyle={{ flex: 1, width: "100%" }}>
                      {columnContent}
                    </Column>
                  </div>
                );
              }

              return (
                <Column key={col.stage} col={col} count={cards.length} extraStyle={{ flex: 1, minWidth: 300 }}>
                  {columnContent}
                </Column>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {draggingTenancy ? <CardPreview t={draggingTenancy} today={today} /> : null}
        </DragOverlay>
      </DndContext>

      <TenancyDetailDialog
        tenancy={openTenancy}
        open={!!openTenancy}
        onOpenChange={(o) => !o && setOpenTenancy(null)}
        onUpdated={(updated) => {
          setLocal((prev) => prev.map((t) => t.id === openTenancy?.id ? { ...t, ...updated } : t));
          if (openTenancy) setOpenTenancy((prev) => prev ? { ...prev, ...updated } : prev);
        }}
      />

      {commissionTenancy && (
        <RenewalCommissionDialog
          t={commissionTenancy}
          open={!!commissionTenancy}
          onClose={() => { setCommissionTenancy(null); router.refresh(); }}
        />
      )}
      {tenantLeavingTenancy && (
        <TenantLeavingDialog
          t={tenantLeavingTenancy}
          open={!!tenantLeavingTenancy}
          onClose={() => { setTenantLeavingTenancy(null); router.refresh(); }}
        />
      )}
      {ownerLeavingTenancy && (
        <OwnerLeavingDialog
          t={ownerLeavingTenancy}
          open={!!ownerLeavingTenancy}
          onClose={() => { setOwnerLeavingTenancy(null); router.refresh(); }}
        />
      )}
      {lostTenancy && (
        <LostContractDialog
          t={lostTenancy}
          open={!!lostTenancy}
          onClose={() => { setLostTenancy(null); router.refresh(); }}
        />
      )}

      {/* Plan cap dialog */}
      <PlanCapDialog
        open={capBlocked}
        currentPlan={plan}
        currentCount={totalCards ?? activeCardCount}
        currentCap={isFinite(planCap) ? planCap : 0}
        upgradeToId={UPGRADE_FROM[plan]?.id ?? "elite"}
        upgradeCap={UPGRADE_FROM[plan]?.cap ?? null}
        onClose={() => setCapBlocked(false)}
      />

      {/* Drag-to-column confirmation */}
      {pendingMove && (
        <Dialog open onOpenChange={(v) => { if (!v) setPendingMove(null); }}>
          <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                  Move to {COLUMNS.find((c) => c.stage === pendingMove.target)?.label ?? pendingMove.target}?
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                  {pendingMove.t.property?.owner_name} · {pendingMove.t.property_name?.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingMove(null)}
                  className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  className="flex-1 kk-scale-hover flex items-center justify-center text-[13px] font-semibold py-2 rounded-full"
                  style={{ background: COLUMNS.find((c) => c.stage === pendingMove.target)?.ink ?? "var(--kk-ink)", color: "#fff" }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <Dialog open onOpenChange={(v) => { if (!v) setConfirmBulkDelete(false); }}>
          <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEF2F2" }}>
                  <Trash2 className="w-5 h-5" style={{ color: "#DC2626" }} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                    Delete {selectedIds.size} {selectedIds.size === 1 ? "contract" : "contracts"}?
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>
                    Moved to bin — auto-deleted after 7 days
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
                  style={{ background: "#DC2626", color: "#fff", opacity: bulkDeleting ? 0.7 : 1 }}
                >
                  {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Move to bin
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Optimistic stage transition
function optimisticApply(t: Tenancy, target: LifecycleStage): Tenancy {
  const next: Tenancy = { ...t, lifecycle_stage: target };
  if (target === "renewing")  { next.replied_tenant = "yes"; next.replied_owner = "yes"; }
  if (target === "replacing") { next.replied_owner = "yes"; if (t.replied_tenant === "pending") next.replied_tenant = "no"; }
  if (target === "ending")    { next.replied_owner = "no"; }
  return next;
}

// ─── Column ──────────────────────────────────────────────────────────────────

function Column({ col, count, children, extraStyle }: { col: ColMeta; count: number; children: React.ReactNode; extraStyle?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.stage });
  const Icon = col.Icon;
  const isHeadsup = col.stage === "headsup";
  const isExpired = col.stage === "expired";
  return (
    <div
      ref={setNodeRef}
      id={`kk-col-${col.stage}`}
      className="kk-board-col"
      style={{
        background: isOver
          ? col.soft
          : isHeadsup
            ? "radial-gradient(ellipse 110% 70% at 50% 25%, color-mix(in srgb, var(--kk-theme-dark) 18%, transparent) 0%, color-mix(in srgb, var(--kk-theme-dark) 8%, transparent) 40%, var(--kk-surface) 68%)"
            : isExpired
              ? "radial-gradient(ellipse 110% 70% at 50% 25%, color-mix(in srgb, #C62828 10%, transparent) 0%, color-mix(in srgb, #C62828 4%, transparent) 40%, var(--kk-surface) 68%)"
              : "var(--kk-surface)",
        outline: isOver
          ? `2px solid ${col.ink}`
          : isHeadsup
            ? "1px solid color-mix(in srgb, var(--kk-theme-dark) 30%, transparent)"
            : isExpired
              ? "1px solid color-mix(in srgb, #C62828 25%, transparent)"
              : "1px solid transparent",
        outlineOffset: "-1px",
        boxShadow: isOver
          ? undefined
          : isHeadsup
            ? "0 0 0 1px color-mix(in srgb, var(--kk-theme-dark) 22%, transparent), 0 0 14px 5px color-mix(in srgb, var(--kk-theme-dark) 15%, transparent)"
            : isExpired
              ? "0 0 0 1px color-mix(in srgb, #C62828 18%, transparent), 0 0 14px 5px color-mix(in srgb, #C62828 10%, transparent)"
              : "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        ...extraStyle,
      }}
    >
      <div
        className="kk-board-col-header"
        style={{
          borderBottomColor: col.soft,
          ...(isHeadsup ? { background: "color-mix(in srgb, var(--kk-theme-dark) 8%, var(--kk-surface))" } : {}),
          ...(isExpired ? { background: "color-mix(in srgb, #C62828 7%, var(--kk-surface))" } : {}),
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: col.soft, color: col.ink }}>
            <Icon className="w-3 h-3" />
          </span>
          <span className="kk-overline whitespace-nowrap" style={{ color: "var(--kk-ink-soft)" }}>{col.label}</span>
          <span className="ml-auto text-[11px] font-semibold tabular-nums px-1.5 rounded-full"
            style={{ color: col.ink, background: col.soft }}>
            {count}
          </span>
        </div>
        <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--kk-ink-mute)" }}>{col.hint}</p>
      </div>
      <div className="kk-board-col-body">
        <div className="kk-board-col-body-inner">{children}</div>
      </div>
    </div>
  );
}

function EmptyDrop({ col }: { col: ColMeta }) {
  const isExpired = col.stage === "expired";
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-8 px-3 text-center text-[12px] gap-1"
      style={{ background: "var(--kk-surface)", border: "1px dashed var(--kk-line-strong)", color: "var(--kk-ink-faint)" }}>
      {isExpired
        ? <span className="text-[11px] leading-snug">Contracts past their end date<br />will appear here automatically</span>
        : <>
            <span>Drop here</span>
            <span className="text-[10px] uppercase tracking-wider">to move into {col.label.toLowerCase()}</span>
          </>
      }
    </div>
  );
}


// ─── Card ────────────────────────────────────────────────────────────────────

function Card({ t, col, today, plan, isDragging, onOpen, onShowCommission, onShowTenantLeaving, onShowOwnerLeaving, onShowLostContract, onMoveToStage, selectMode, selected, onToggleSelect }: {
  t: Tenancy; col: ColMeta; today: Date; plan: string; isDragging: boolean;
  onOpen: () => void;
  onShowCommission: () => void;
  onShowTenantLeaving: () => void;
  onShowOwnerLeaving: () => void;
  onShowLostContract: () => void;
  onMoveToStage: (id: string, stage: LifecycleStage) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const ph = usePostHog();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: t.id, disabled: selectMode });
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress() {
    if (selectMode) return;
    pressTimer.current = setTimeout(() => setPressing(true), 150);
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setPressing(false);
  }

  const isHeadsupLike = col.stage === "headsup" || col.stage === "expired";

  const cardStyle: React.CSSProperties = isDragging ? { opacity: 0.2 } : {};
  if (isHeadsupLike && !isDragging) {
    const shadowColor = col.stage === "expired" ? "#C62828" : "var(--kk-theme-dark)";
    cardStyle.boxShadow = `0 4px 14px color-mix(in srgb, ${shadowColor} 14%, transparent), 0 1px 4px rgba(0,0,0,0.06)`;
  }

  const days = t.contract_end ? daysUntil(t.contract_end, today) : 0;
  const propBase = t.property_name?.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim() ?? "";
  const unitLabel = (t.property_name?.match(/Unit\s+[A-Za-z0-9-]+/i) ?? [])[0] ?? (t.property?.unit ? `Unit ${t.property.unit}` : "");
  const coverIdx = t.property?.cover_photo_index ?? 0;
  const photo = t.property?.photo_urls?.[coverIdx] ?? t.property?.photo_urls?.[0];

  const daysBg    = days < 0 ? "var(--kk-surface-2)" : days <= 30 ? "var(--kk-red-soft)"   : "var(--kk-amber-soft)";
  const daysColor = days < 0 ? "var(--kk-ink-mute)"  : days <= 30 ? "#C62828"              : "#B45309";
  const daysLabel = days < 0 ? `${Math.abs(days)}d over` : days === 0 ? "Today" : `${days}d`;

  return (
    <div
      ref={setNodeRef}
      data-card-id={t.id}
      id={`tour-tenancy-${t.id}`}
      {...attributes}
      {...listeners}
      onTouchStart={(e) => { listeners?.onTouchStart?.(e); startPress(); }}
      onTouchEnd={(e) => { listeners?.onTouchEnd?.(e); cancelPress(); }}
      onTouchCancel={(e) => { listeners?.onTouchCancel?.(e); cancelPress(); }}
      style={{ ...cardStyle, position: "relative", ...(selectMode && selected ? { outline: "2px solid var(--kk-blue)", outlineOffset: -1 } : {}) }}
      className={`kk-card ${!isDragging ? "kk-card-hover" : ""} ${pressing && !isDragging ? "kk-card-shake" : ""} p-3 flex flex-col gap-2 ${selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} lg:touch-none select-none`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-card-action], [data-chip]")) return;
        if (selectMode) { onToggleSelect?.(); return; }
        track(ph, "card_opened", { type: "tenancy", card_id: t.id, col: col.stage });
        if (col.stage === "headsup") track(ph, "contract_expiry_viewed", { card_id: t.id });
        onOpen();
      }}
    >
      {selectMode && (
        <div
          className="absolute flex items-center justify-center"
          style={{ top: 8, right: 8, zIndex: 1, color: selected ? "var(--kk-blue)" : "var(--kk-ink-faint)", background: "#fff", borderRadius: 6 }}
        >
          {selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </div>
      )}

      {/* Compact horizontal: photo + info */}
      <div className="flex gap-2.5">
        <div
          className="w-[64px] h-[64px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
        >
          {photo
            ? <Image src={photo} alt="" width={64} height={64} className="w-full h-full object-cover" loading="lazy" />
            : <Home className="w-5 h-5" style={{ color: "var(--kk-ink-faint)" }} />
          }
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
              {propBase || "—"}
            </p>
            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: daysBg, color: daysColor }}>
              {daysLabel}
            </span>
          </div>

          <p className="text-[11px] leading-tight">
            {unitLabel && <span style={{ color: "var(--kk-ink-soft)" }}>{unitLabel} · </span>}
            <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {t.amount.toLocaleString()}/mo</span>
            {(t.property?.bedrooms != null || t.property?.bathrooms != null) && (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--kk-ink-faint)" }}>
                {" · "}
                {t.property.bedrooms != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Bed style={{ width: 10, height: 10, display: "inline" }} />{t.property.bedrooms === 0 ? "Studio" : t.property.bedrooms}
                  </span>
                )}
                {t.property.bathrooms != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Bath style={{ width: 10, height: 10, display: "inline" }} />{t.property.bathrooms}
                  </span>
                )}
              </span>
            )}
          </p>

          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>
                {t.property?.owner_name ?? "—"}
              </p>
            </div>
            {t.contract_end && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Calendar className="w-2.5 h-2.5" style={{ color: "var(--kk-ink-faint)" }} />
                <span className="text-[10px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                  {formatContractDate(t.contract_end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WA reply status badge */}
      <WaStatusBadge t={t} />

      {/* Actions */}
      {plan !== "silver" && <RentReminderAction t={t} today={today} />}
      {!isHeadsupLike && (
        <ColumnAction t={t} stage={col.stage as LifecycleStage} today={today} onShowCommission={onShowCommission} />
      )}
      {isHeadsupLike && (
        <>
          <HeadsupTenantAction t={t} />
          <HeadsupOwnerAction t={t} />
          <WhatsNext
            t={t}
            onMoveToStage={onMoveToStage}
            onShowTenantLeaving={onShowTenantLeaving}
            onShowOwnerLeaving={onShowOwnerLeaving}
            onShowCommission={onShowCommission}
            onShowLostContract={onShowLostContract}
          />
        </>
      )}
    </div>
  );
}

// ─── Renewal responses — compact inline row ───────────────────────────────────

function RenewalResponses({ t }: { t: Tenancy }) {
  const tenantDone = !!t.tenant_renewal_completed_at;
  const ownerDone  = !!t.owner_renewal_completed_at;

  const tenantLabel = tenantDone ? (t.replied_tenant === "yes" ? "Tenant ✓" : "Tenant ✗") : "Tenant ?";
  const tenantColor = tenantDone ? (t.replied_tenant === "yes" ? "var(--kk-green)" : "#C62828") : "var(--kk-ink-faint)";
  const ownerLabel  = ownerDone  ? (t.replied_owner  === "yes" ? "Owner ✓"  : "Owner ✗")  : "Owner ?";
  const ownerColor  = ownerDone  ? (t.replied_owner  === "yes" ? "var(--kk-green)" : "#C62828") : "var(--kk-ink-faint)";

  return (
    <div data-card-action className="flex items-center gap-3">
      <span className="text-[11px] font-semibold" style={{ color: tenantColor }}>{tenantLabel}</span>
      <span className="text-[11px] font-semibold" style={{ color: ownerColor }}>{ownerLabel}</span>
    </div>
  );
}

// ─── WA reply status badge ────────────────────────────────────────────────────

function WaStatusBadge({ t }: { t: Tenancy }) {
  if (!t.wa_status) return null;

  if (t.wa_status === "pending") {
    return (
      <div className="flex items-center gap-1.5 px-0.5" style={{ color: "#B45309" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0, display: "inline-block" }} />
        <span className="text-[11px] font-medium">Sent, waiting for reply</span>
      </div>
    );
  }

  if (t.wa_status === "no_response") {
    return (
      <div className="flex items-center gap-1.5 px-0.5" style={{ color: "#991B1B" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0, display: "inline-block" }} />
        <span className="text-[11px] font-medium">No response</span>
      </div>
    );
  }

  if (t.wa_status === "replied" && t.last_wa_reply_at) {
    const minutesAgo = Math.round((Date.now() - new Date(t.last_wa_reply_at).getTime()) / 60000);
    const timeLabel = minutesAgo < 60
      ? `${minutesAgo}m ago`
      : minutesAgo < 1440
      ? `${Math.round(minutesAgo / 60)}h ago`
      : `${Math.round(minutesAgo / 1440)}d ago`;
    const snippet = t.last_wa_reply_text
      ? t.last_wa_reply_text.length > 40
        ? t.last_wa_reply_text.slice(0, 37) + "…"
        : t.last_wa_reply_text
      : "";

    const tenantIntent = t.replied_tenant;
    const ownerIntent = t.replied_owner;

    const rows: { dot: string; label: string; labelColor: string }[] = [];

    if (tenantIntent === "yes") {
      rows.push({ dot: "#22C55E", label: `Tenant: renewing ✓ · ${timeLabel}`, labelColor: "#166534" });
    } else if (tenantIntent === "no") {
      rows.push({ dot: "#EF4444", label: `Tenant: not renewing · ${timeLabel}`, labelColor: "#991B1B" });
    } else if (tenantIntent === "pending" || !tenantIntent) {
      // Replied but intent unclear — show snippet
      rows.push({ dot: "#94A3B8", label: `Replied ${timeLabel}${snippet ? ` · ${snippet}` : ""}`, labelColor: "var(--kk-ink-mute)" });
    }

    if (ownerIntent === "yes") {
      rows.push({ dot: "#22C55E", label: `Owner: interested ✓`, labelColor: "#166534" });
    } else if (ownerIntent === "no") {
      rows.push({ dot: "#EF4444", label: `Owner: not interested`, labelColor: "#991B1B" });
    } else if (ownerIntent === "pending") {
      rows.push({ dot: "#94A3B8", label: `Owner replied — check message`, labelColor: "var(--kk-ink-mute)" });
    }

    if (rows.length === 0) {
      rows.push({ dot: "#94A3B8", label: `Replied ${timeLabel}${snippet ? ` · ${snippet}` : ""}`, labelColor: "var(--kk-ink-mute)" });
    }

    return (
      <div className="flex flex-col gap-1 px-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.dot, flexShrink: 0, display: "inline-block" }} />
            <span className="text-[11px] font-medium" style={{ color: r.labelColor }}>{r.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ─── Rent reminder — date-driven, shown regardless of stage ──────────────────

function RentReminderAction({ t, today }: { t: Tenancy; today: Date }) {
  const [waUrl, setWaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!t.contract_start || !t.tenant_phone) return;
    const daysSinceStart = Math.round((today.getTime() - new Date(t.contract_start).getTime()) / 86400000);
    const daysToEnd = t.contract_end
      ? Math.round((new Date(t.contract_end).getTime() - today.getTime()) / 86400000)
      : 999;
    if (daysSinceStart < -7 || daysSinceStart > 90 || daysToEnd <= 0) return;
    setWaUrl(buildWhatsAppPingUrl(
      t.tenant_phone ?? "", t.tenant_name ?? "",
      t.property_name ?? "your property", t.amount,
      `${window.location.origin}/upload/${t.id}`,
      t.tenant_whatsapp_username,
    ));
  }, [t, today]);

  if (!waUrl) return null;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-card-action
      onClick={e => e.stopPropagation()}
      className="kk-card-cta kk-card-cta-soft-green"
      style={{ textDecoration: "none" }}
    >
      <span className="flex items-start gap-1.5 min-w-0 flex-1">
        <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Send rent reminder</span>
      </span>
      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    </a>
  );
}

// ─── Column action ────────────────────────────────────────────────────────────

function ColumnAction({ t, stage, today, onShowCommission }: {
  t: Tenancy; stage: LifecycleStage; today: Date;
  onShowCommission: () => void;
}) {
  if (stage === "headsup") return null;

  if (stage === "active") {
    const days = t.contract_end ? Math.round((new Date(t.contract_end).getTime() - today.getTime()) / 86400000) : 0;
    return (
      <span className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--kk-ink-faint)" }}>
        <Check className="w-3.5 h-3.5" />
        {days > 0 ? `${days} days remain` : "On track"}
      </span>
    );
  }

  if (stage === "renewing") {
    return (
      <button
        type="button"
        data-card-action
        onClick={(e) => { e.stopPropagation(); onShowCommission(); }}
        className="kk-card-cta kk-card-cta-soft-green"
      >
        <span className="flex items-start gap-1.5 min-w-0 flex-1">
          <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Moved in</span>
        </span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      </button>
    );
  }

  return (
    <span className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--kk-ink-faint)" }}>
      <Lock className="w-3.5 h-3.5" />
      Tenancy archived
    </span>
  );
}

// ─── "What's next?" dropdown + confirmation dialog for Expiring cards ────────

type OutcomeChoice = "" | "renew" | "replace" | "stop" | "lost";

const OUTCOME_META: Record<Exclude<OutcomeChoice, "">, {
  label: string;
  description: string;
  confirm: string;
  soft: string;
  ink: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  renew: {
    label: "Renew contract",
    description: "This will move the card to Renewing. Once there, click 'Moved in' to log the move-in and set the new contract end date.",
    confirm: "Yes, move to Renewing",
    soft: "var(--kk-green-soft)",
    ink: "#1F8B4C",
    Icon: CheckCircle,
  },
  replace: {
    label: "Find new tenant",
    description: "This will keep the property listed for a new tenant. You'll be prompted to create the listing through Make New Money.",
    confirm: "Set up new listing",
    soft: "var(--kk-theme-light)",
    ink: "var(--kk-theme-dark)",
    Icon: ArrowRight,
  },
  stop: {
    label: "Stop renting",
    description: "The owner will be marked as own stay and this tenancy will be archived. The tenant will be flagged as seeking a new place — you can help them find one.",
    confirm: "Archive & own stay",
    soft: "var(--kk-surface-2)",
    ink: "var(--kk-ink-mute)",
    Icon: Lock,
  },
  lost: {
    label: "Lost contract",
    description: "Another agent took over this unit. This will close the tenancy and move the property to Target Listing so you can track and win it back.",
    confirm: "Move to Target Listing",
    soft: "#FEF2F2",
    ink: "#C62828",
    Icon: ShieldAlert,
  },
};

// ─── Headsup: message tenant ──────────────────────────────────────────────────

function HeadsupTenantAction({ t }: { t: Tenancy }) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();

  if (!t.tenant_phone) return null;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await buildExpiryPingTenant(t.id);
      if (res) { window.open(res.url, "_blank", "noopener"); track(ph, "whatsapp_sent", { type: "tenant", template: "renewal_expiry" }); }
    });
  }

  return (
    <button
      data-card-action
      onClick={handleClick}
      disabled={pending}
      className="kk-card-cta kk-card-cta-soft-green"
    >
      <span className="flex items-start gap-1.5 min-w-0 flex-1">
        {pending
          ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
          : <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <span>Message tenant</span>
      </span>
      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    </button>
  );
}

// ─── Headsup: message owner ───────────────────────────────────────────────────

function HeadsupOwnerAction({ t }: { t: Tenancy }) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();

  if (!t.property?.owner_phone) return null;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await buildExpiryPingOwner(t.id);
      if (res) { window.open(res.url, "_blank", "noopener"); track(ph, "whatsapp_sent", { type: "owner", template: "renewal_expiry" }); }
    });
  }

  return (
    <button
      data-card-action
      onClick={handleClick}
      disabled={pending}
      className="kk-card-cta kk-card-cta-soft-green"
    >
      <span className="flex items-start gap-1.5 min-w-0 flex-1">
        {pending
          ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
          : <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <span>Message owner</span>
      </span>
      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    </button>
  );
}

function WhatsNext({ t, onMoveToStage, onShowTenantLeaving, onShowOwnerLeaving, onShowLostContract }: {
  t: Tenancy;
  onMoveToStage: (id: string, stage: LifecycleStage) => void;
  onShowTenantLeaving: () => void;
  onShowOwnerLeaving: () => void;
  onShowCommission: () => void;
  onShowLostContract: () => void;
}) {
  const [choice, setChoice] = useState<OutcomeChoice>("");
  const [confirming, setConfirming] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !dropdownMenuRef.current?.contains(target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [dropdownOpen]);

  function toggleDropdown() {
    if (!dropdownOpen && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left });
    }
    setDropdownOpen(o => !o);
  }

  function onSelectChange(val: OutcomeChoice) {
    setDropdownOpen(false);
    setChoice(val);
    if (val === "lost") {
      onShowLostContract(); // go directly to the lost contract dialog (no intermediate confirm)
    } else if (val) {
      setConfirming(true);
    }
  }

  function handleConfirm() {
    setConfirming(false);
    setChoice("");
    if (choice === "renew")   onMoveToStage(t.id, "renewing");
    if (choice === "replace") onShowTenantLeaving();
    if (choice === "stop")    onShowOwnerLeaving();
    if (choice === "lost")    onShowLostContract();
  }

  const meta = choice ? OUTCOME_META[choice] : null;

  const proposedParts = [
    t.renewal_proposed_months ? `${t.renewal_proposed_months / 12}yr` : null,
    t.renewal_proposed_start
      ? `from ${new Date(t.renewal_proposed_start).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}`
      : null,
    t.renewal_proposed_rent ? `RM ${t.renewal_proposed_rent.toLocaleString()}/mo` : null,
  ].filter(Boolean).join(" · ");

  const hasProposed = !!(t.owner_renewal_completed_at && t.replied_owner === "yes" && proposedParts);

  return (
    <>
      <div
        data-card-action
        className="flex flex-col gap-2 pt-2"
        style={{ borderTop: "1px solid var(--kk-line)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Row 1: dropdown + proposed contract terms */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              type="button"
              onClick={toggleDropdown}
              className="flex items-center gap-2 text-[12px] pl-3 pr-2.5 py-1.5 rounded-lg"
              style={{
                background: "var(--kk-surface-2)",
                color: choice ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                border: "1px solid var(--kk-line)",
              }}
            >
              {choice ? OUTCOME_META[choice].label : "What's next?"}
              <ChevronDown className="w-3 h-3 shrink-0 transition-transform" style={{ color: "var(--kk-ink-faint)", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {dropdownOpen && dropdownPos && createPortal(
              <div
                ref={dropdownMenuRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  zIndex: 9999,
                  background: "#fff",
                  border: "1px solid var(--kk-line)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 160,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                }}
              >
                {(["renew", "replace", "stop", "lost"] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onSelectChange(val)}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--kk-surface-2)] transition-colors"
                    style={{ color: val === "lost" ? "#C62828" : "var(--kk-ink)" }}
                  >
                    {OUTCOME_META[val].label}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          {hasProposed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: "var(--kk-ink-faint)" }}>New contract</span>
              <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{proposedParts}</span>
            </div>
          )}
        </div>

        {/* Row 2: form response status — only when at least one party responded */}
        {(t.tenant_renewal_completed_at || t.owner_renewal_completed_at) && (
          <RenewalResponses t={t} />
        )}
      </div>

      {meta && (
        <Dialog open={confirming} onOpenChange={(v) => { if (!v) { setConfirming(false); setChoice(""); } }}>
          <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: meta.soft, color: meta.ink }}>
                    <meta.Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>{meta.label}</p>
                    <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{t.property?.owner_name} · {t.property_name?.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim()}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setConfirming(false); setChoice(""); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-mute)" }}>
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl p-4" style={{ background: meta.soft }}>
                <p className="text-[13px] leading-relaxed" style={{ color: meta.ink }}>{meta.description}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(false); setChoice(""); }}
                  className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                  className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
                  style={{ background: meta.ink, color: "#fff" }}
                >
                  {meta.confirm} →
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Lost contract dialog ─────────────────────────────────────────────────────

function LostContractDialog({ t, open, onClose }: { t: Tenancy; open: boolean; onClose: () => void }) {
  const [competitorEnd, setCompetitorEnd] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await lostContractAction(t.id, t.owner_lead_id ?? null, competitorEnd || null);
      if (res.ok) {
        onClose();
      } else {
        toast.error(res.message ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !pending) onClose(); }}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#FEF2F2" }}>
                <ShieldAlert className="w-4 h-4" style={{ color: "#C62828" }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Lost contract</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{t.property?.owner_name} · {t.property_name?.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim()}</p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-mute)" }}>
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl p-4" style={{ background: "#FEF2F2" }}>
            <p className="text-[13px] leading-relaxed" style={{ color: "#C62828" }}>
              Another agent took over this unit. The tenancy will be closed and the property will move to Target Listing so you can track it and win it back.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-medium mb-1.5" style={{ color: "var(--kk-ink-mute)" }}>
              Competitor contract end date <span style={{ color: "var(--kk-ink-faint)" }}>(optional)</span>
            </p>
            <DateInput
              value={competitorEnd}
              onChange={setCompetitorEnd}
              className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
              Used to track when you can approach the owner again.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              disabled={pending}
              className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={pending}
              className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
              style={{ background: "#C62828", color: "#fff", opacity: pending ? 0.7 : 1 }}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Move to Lost Listing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${y}`;
}

function normalizePropName(n: string): string {
  return n.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim();
}

function formatContractDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} '${String(y).slice(2)}`;
}

function CardPreview({ t, today }: { t: Tenancy; today: Date }) {
  const days = t.contract_end ? daysUntil(t.contract_end, today) : 0;
  const propBase = t.property_name?.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/i, "").trim() ?? "";
  const unitLabel = (t.property_name?.match(/Unit\s+[A-Za-z0-9-]+/i) ?? [])[0] ?? (t.property?.unit ? `Unit ${t.property.unit}` : "");
  const coverIdx = t.property?.cover_photo_index ?? 0;
  const photo = t.property?.photo_urls?.[coverIdx] ?? t.property?.photo_urls?.[0];
  const daysBg    = days < 0 ? "var(--kk-surface-2)" : days <= 30 ? "var(--kk-red-soft)"   : "var(--kk-amber-soft)";
  const daysColor = days < 0 ? "var(--kk-ink-mute)"  : days <= 30 ? "#C62828"              : "#B45309";
  const daysLabel = days < 0 ? `${Math.abs(days)}d over` : days === 0 ? "Today" : `${days}d`;
  return (
    <div
      className="kk-card p-3 flex gap-2.5"
      style={{ width: 280, opacity: 0.96, transform: "rotate(2deg)", boxShadow: "0 16px 40px rgba(0,0,0,0.22)", cursor: "grabbing" }}
    >
      <div className="w-[64px] h-[64px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <Home className="w-5 h-5" style={{ color: "var(--kk-ink-faint)" }} />}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)" }}>{propBase || "—"}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: daysBg, color: daysColor }}>{daysLabel}</span>
        </div>
        <p className="text-[11px]">
          {unitLabel && <span style={{ color: "var(--kk-ink-soft)" }}>{unitLabel} · </span>}
          <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {t.amount.toLocaleString()}/mo</span>
        </p>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
          <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>{t.property?.owner_name ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
