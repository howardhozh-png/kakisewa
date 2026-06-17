"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import Image from "next/image";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { OwnerLead } from "@/lib/types";
import { setOwnerLeadStage, sendOwnerOutreach, markCommissionCollected, generateOwnerIntakeLink } from "@/lib/actions";
import { ConfirmMovedInDialog } from "@/components/confirm-moved-in-dialog";
import { Megaphone, XCircle, ArrowRight, Phone, Loader2, X as XIcon, Check, Users, Banknote, CheckCircle2, Clock, User, Home, Calendar, Building2, Search } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import Link from "next/link";
import { EditOwnerLeadDialog } from "@/components/edit-owner-lead-dialog";
import { ConvertToTenancyDialog } from "@/components/convert-to-tenancy-dialog";
import { CommissionConfirmDialog } from "@/components/commission-confirm-dialog";
import { ConfirmListedDialog } from "@/components/confirm-listed-dialog";
import { CompetitorRentedDialog } from "@/components/competitor-rented-dialog";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filter-select";
import { AvailabilityTimeline } from "@/components/availability-timeline";
import { useWhatsAppGate } from "@/hooks/use-whatsapp-gate";
import { WhatsAppGateDialog } from "@/components/whatsapp-gate-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Stage = OwnerLead["stage"];

interface ColMeta {
  stage: Stage;
  label: string;
  hint: string;
  ink: string;
  soft: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
}

// Visible columns — terminal stages (own_stay, archived) hidden by default.
// Imported leads are managed in the Outreach tab — Pipeline shows responded+ only.
const COLUMNS: ColMeta[] = [
  { stage: "listed",   label: "Listed",     hint: "Build the tenant pack. Find the right tenant and close the deal.", ink: "var(--kk-theme-dark)", soft: "var(--kk-theme-light)", dot: "var(--kk-theme-dark)", Icon: Megaphone },
  { stage: "matched",  label: "Rented",     hint: "Well done, proud of you!",                                         ink: "var(--kk-theme-dark)", soft: "var(--kk-theme-light)", dot: "var(--kk-theme-dark)", Icon: Check     },
];


type TenantInfo = {
  tenant_name: string;
  tenant_phone: string;
  tenancy_id: string;
  lifecycle_stage: string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_duration_months: number | null;
  amount: number;
};

interface Props {
  leads: OwnerLead[];
  openLeadId?: string;
  highlightId?: string;
  tenantsByLeadId?: Record<string, TenantInfo>;
  rankedLeadIds?: Set<string>;
}

export function OwnerPipelineBoard({ leads, openLeadId, highlightId, tenantsByLeadId = {}, rankedLeadIds = new Set() }: Props) {
  const router = useRouter();
  const ph = usePostHog();
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<OwnerLead | null>(null);
  const [editingLead, setEditingLead] = useState<OwnerLead | null>(null);
  const [matchingLead, setMatchingLead] = useState<OwnerLead | null>(null);
  const [commissionLead, setCommissionLead] = useState<{ lead: OwnerLead; tenancyId: string } | null>(null);
  const [confirmedMovedIn, setConfirmedMovedIn] = useState<{ lead: OwnerLead; info: TenantInfo } | null>(null);
  const [competitorRentedLead, setCompetitorRentedLead] = useState<OwnerLead | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [purposeFilter, setPurposeFilter] = useState<"" | "rent" | "sell">("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [ownerRespondedFilter, setOwnerRespondedFilter] = useState(false);

  const [local, setLocal] = useState<OwnerLead[]>(leads);
  useEffect(() => { setLocal(leads); }, [leads]);

  // Auto-refresh every 5s while any lead has pending intake OR active listed deals (catches owner pack rankings)
  useEffect(() => {
    const hasPending = local.some((l) => l.intake_sent_at && !l.intake_completed_at);
    const hasActive = local.some((l) => ["listed", "wants_rent", "replied"].includes(l.stage));
    if (!hasPending && !hasActive) return;
    const id = setInterval(() => router.refresh(), 5_000);
    return () => clearInterval(id);
  }, [local, router]);

  // Auto-open a specific lead when navigated from another page (only once)
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (openLeadId && !hasAutoOpened.current) {
      const lead = leads.find((l) => l.id === openLeadId);
      if (lead) {
        setEditingLead(lead);
        hasAutoOpened.current = true;
        router.replace("/my-listing", { scroll: false });
      }
    }
  }, [openLeadId, leads, router]);

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

  // Unique property names + counts for the dropdown
  const propertyOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    local.forEach((l) => {
      if (!l.property_name || ["own_stay", "archived", "imported"].includes(l.stage)) return;
      counts[l.property_name] = (counts[l.property_name] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [local]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return local.filter((l) => {
      if (l.is_competitor_target) return false;
      if (q && ![l.property_name, l.owner_name, l.unit].some(f => f?.toLowerCase().includes(q))) return false;
      if (propertyFilter && (l.property_name ?? "") !== propertyFilter) return false;
      if (purposeFilter && l.listing_purpose !== purposeFilter && l.listing_purpose !== "both") return false;
      if (monthFilter && l.available_from?.slice(0, 7) !== monthFilter) return false;
      if (monthFilter && !["listed", "wants_rent", "replied"].includes(l.stage)) return false;
      if (ownerRespondedFilter && ["listed", "wants_rent", "replied"].includes(l.stage) && !rankedLeadIds.has(l.id)) return false;
      return true;
    });
  }, [local, search, propertyFilter, purposeFilter, monthFilter, ownerRespondedFilter, rankedLeadIds]);

  const byStage = useMemo(() => {
    const out: Record<Stage, OwnerLead[]> = {
      imported: [], replied: [], wants_rent: [], listed: [], matched: [], own_stay: [], archived: [],
    };
    filtered.forEach((l) => {
      // Imported leads belong in the Outreach tab, not the Pipeline board
      if (l.stage === "imported") return;
      // wants_rent and replied both map to listed (owner responded → auto-listed)
      const stage = (l.stage === "wants_rent" || l.stage === "replied") ? "listed" : l.stage;
      // Hide matched leads that have an active tenancy — they live in Existing Listing
      if (l.has_active_tenancy) return;
      out[stage].push(l);
    });
    return out;
  }, [filtered, tenantsByLeadId]);

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const target = String(e.over.id) as Stage;
    const lead = local.find((x) => x.id === id);
    if (!lead || lead.stage === target) return;

    // Gate on Listed — require property details + availability date before allowing move
    if (target === "listed") {
      const hasRequired = lead.property_name && lead.expected_rent && lead.available_from && lead.bedrooms != null && lead.bathrooms != null;
      if (!hasRequired) {
        setEditingLead(lead);
        toast.error("Fill in property name, rent, availability date, bedrooms and bathrooms before marking as Listed.");
        return;
      }
    }

    // Gate on Matched — open tenancy creation dialog instead of moving directly
    if (target === "matched") {
      setMatchingLead(lead);
      return;
    }

    // Optimistic — move now, no confirm
    const optimistic = { ...lead, stage: target };
    setLocal((prev) => prev.map((l) => (l.id === id ? optimistic : l)));

    const res = await setOwnerLeadStage(id, target);
    if (res.ok) {
      track(ph, "pipeline_card_moved", { from_col: lead.stage, to_col: target, type: "owner_lead" });
      router.refresh();
    } else {
      setLocal(leads);
      toast.error("Could not move card.");
    }
  }

  function leadCommission(l: OwnerLead): number {
    return l.expected_rent ?? 0;
  }

  return (
    <>
      {/* Sentinel used by the highlight effect to scroll the page to the board */}
      <div ref={boardRef} style={{ scrollMarginTop: 80 }} />

      {/* Availability bar chart — respects property filter */}
      <div className="kk-section p-5 mb-5">
        <div className="mb-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>See how many units are available each month, up to 24 months ahead</p>
        </div>
        <AvailabilityTimeline
          leads={local.filter((l) => {
            if (l.is_competitor_target) return false;
            if (propertyFilter && l.property_name !== propertyFilter) return false;
            return l.stage === "listed" || l.stage === "wants_rent" || l.stage === "replied";
          })}
          commissionPct={100}
          selectedMonth={monthFilter}
          onMonthClick={(key) => setMonthFilter((prev) => (prev === key ? "" : key))}
        />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-0.5 lg:flex-wrap" style={{ scrollbarWidth: "none" }}>
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
          options={[{ value: "", label: "All properties" }, ...propertyOptions.map(([p, count]) => ({ value: p, label: `${p} (${count})` }))]}
          minWidth={180}
        />
        <FilterSelect
          value={purposeFilter}
          onChange={(v) => setPurposeFilter(v as "" | "rent" | "sell")}
          options={[
            { value: "",     label: "All purposes" },
            { value: "rent", label: "For Rent" },
            { value: "sell", label: "For Sale" },
          ]}
          minWidth={140}
        />
        <button
          onClick={() => setOwnerRespondedFilter((v) => !v)}
          className="text-[13px] px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 shrink-0"
          style={{
            background: ownerRespondedFilter ? "rgba(52,199,89,0.12)" : "rgba(0,0,0,0.06)",
            border: ownerRespondedFilter ? "1px solid rgba(52,199,89,0.40)" : "1px solid var(--kk-line)",
            color: ownerRespondedFilter ? "#1F8B4C" : "var(--kk-ink-mute)",
          }}
        >
          <CheckCircle2 className="w-3 h-3" /> Owner responded
        </button>
        {(propertyFilter || purposeFilter || ownerRespondedFilter) && (
          <button
            onClick={() => { setPropertyFilter(""); setPurposeFilter(""); setOwnerRespondedFilter(false); }}
            className="text-[13px] px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5"
            style={{ background: "rgba(0,0,0,0.06)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)" }}
          >
            <XIcon className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="ml-auto shrink-0 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          {filtered.length} of {local.length} leads
        </span>
      </div>

      <DndContext
        id="kakisewa-owner-pipeline"
        sensors={sensors}
        onDragStart={(e) => {
          const id = String(e.active.id);
          setDraggingId(id);
          setActiveLead(local.find((l) => l.id === id) ?? null);
        }}
        onDragEnd={(e) => { setActiveLead(null); handleDragEnd(e); }}
        onDragCancel={() => { setDraggingId(null); setActiveLead(null); }}
      >
        <div className="kk-board-shell -mx-3 lg:-mx-5" data-dragging={draggingId ? true : undefined}>
          <div className="kk-board-row px-3 lg:px-5">
          {(() => {
            return COLUMNS.map((col) => {
              const colFlex: React.CSSProperties = col.stage === "listed"
                ? { flex: 2, minWidth: 380 }
                : { flex: 1, minWidth: 280 };
              const cards = byStage[col.stage];
              const columnContent = cards.length === 0 ? (
                <EmptyDrop col={col} />
              ) : (
                cards.map((l) => (
                  <Card
                    key={l.id}
                    l={l}
                    col={col}
                    isDragging={draggingId === l.id}
                    onEdit={() => setEditingLead(l)}
                    tenantInfo={tenantsByLeadId[l.id]}
                    hasOwnerRanking={rankedLeadIds.has(l.id)}
                    onCommission={(tenancyId) => setCommissionLead({ lead: l, tenancyId })}
                    onConfirmMovedIn={(info) => setConfirmedMovedIn({ lead: l, info })}
                    onTenantConfirmed={() => setMatchingLead(l)}
                    onCompetitorRented={() => setCompetitorRentedLead(l)}
                  />
                ))
              );

              if (col.stage === "listed") {
                return (
                  <div key={col.stage} style={{ position: "relative", minHeight: 0, display: "flex", flexDirection: "column", ...colFlex }}>
                    {/* Messenger-style chat bubble floating above the column */}
                    {!monthFilter && (
                      <div style={{ position: "absolute", top: -50, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, background: "var(--kk-theme-dark)", borderRadius: 22, padding: "10px 20px", boxShadow: "0 4px 14px color-mix(in srgb, var(--kk-theme-dark) 35%, transparent), 0 1px 4px rgba(0,0,0,0.10)" }}>
                          <Banknote className="w-4 h-4" style={{ color: "#fff" }} />
                          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Make new money here!</span>
                          <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid var(--kk-theme-dark)" }} />
                        </div>
                      </div>
                    )}
                    <Column col={col} count={cards.length} extraStyle={{ flex: 1, width: "100%" }}>
                      {columnContent}
                    </Column>
                  </div>
                );
              }

              return (
                <Column key={col.stage} col={col} count={cards.length} extraStyle={colFlex}>
                  {columnContent}
                </Column>
              );
            });
          })()}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeLead ? (
            <CardPreview l={activeLead} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <EditOwnerLeadDialog
        lead={editingLead}
        open={!!editingLead}
        onOpenChange={(o) => !o && setEditingLead(null)}
        onSaved={(updates) => {
          if (!editingLead) return;
          setLocal((prev) =>
            prev.map((l) => (l.id === editingLead.id ? { ...l, ...updates } : l))
          );
        }}
        tenantInfo={tenantsByLeadId[editingLead?.id ?? ""]}
      />

      <ConvertToTenancyDialog
        lead={matchingLead}
        open={!!matchingLead}
        onOpenChange={(o) => !o && setMatchingLead(null)}
        onConverted={() => {
          if (!matchingLead) return;
          setLocal((prev) =>
            prev.map((l) => (l.id === matchingLead.id ? { ...l, stage: "matched" } : l))
          );
          setMatchingLead(null);
          router.refresh();
        }}
      />

      {confirmedMovedIn && (
        <ConfirmMovedInDialog
          open={!!confirmedMovedIn}
          onOpenChange={(o) => !o && setConfirmedMovedIn(null)}
          tenancyId={confirmedMovedIn.info.tenancy_id}
          tenantName={confirmedMovedIn.info.tenant_name}
          propertyLabel={
            confirmedMovedIn.lead.unit
              ? `${confirmedMovedIn.lead.property_name ?? "Property"}, Unit ${confirmedMovedIn.lead.unit}`
              : (confirmedMovedIn.lead.property_name ?? "Property")
          }
          contractStart={confirmedMovedIn.info.contract_start}
          contractEnd={confirmedMovedIn.info.contract_end}
          contractDurationMonths={confirmedMovedIn.info.contract_duration_months}
          amount={confirmedMovedIn.info.amount}
          onConfirmed={() => {
            setConfirmedMovedIn(null);
            router.refresh();
          }}
        />
      )}

      <CommissionConfirmDialog
        open={!!commissionLead}
        onOpenChange={(o) => !o && setCommissionLead(null)}
        ownerName={commissionLead?.lead.owner_name ?? ""}
        propertyName={commissionLead?.lead.property_name ?? null}
        commissionRm={commissionLead?.lead.expected_rent ?? 0}
        onConfirm={async () => {
          if (!commissionLead) return { ok: false };
          const res = await markCommissionCollected(commissionLead.tenancyId);
          if (res.ok) {
            toast.success("Commission marked as collected!");
            router.refresh();
          }
          return res;
        }}
      />

      <CompetitorRentedDialog
        lead={competitorRentedLead}
        open={!!competitorRentedLead}
        onOpenChange={(o) => !o && setCompetitorRentedLead(null)}
      />

    </>
  );
}

function colMeta(s: Stage): ColMeta { return COLUMNS.find((c) => c.stage === s)!; }

function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} '${String(y).slice(2)}`;
}

function formatAvailDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  const avail = new Date(y, m - 1, d);
  if (avail <= today) return "now";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} '${String(y).slice(2)}`;
}

function Column({ col, count, children, extraStyle, headerExtra }: { col: ColMeta; count: number; children: React.ReactNode; extraStyle?: React.CSSProperties; headerExtra?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.stage });
  const Icon = col.Icon;
  return (
    <div
      ref={setNodeRef}
      id={`kk-col-${col.stage}`}
      className="kk-board-col"
      style={{
        background: isOver
          ? col.soft
          : col.stage === "listed"
            ? "radial-gradient(ellipse 110% 70% at 50% 25%, color-mix(in srgb, var(--kk-theme-dark) 20%, transparent) 0%, color-mix(in srgb, var(--kk-theme-dark) 10%, transparent) 40%, var(--kk-surface) 68%)"
            : "var(--kk-surface)",
        outline: isOver
          ? `2px solid ${col.ink}`
          : col.stage === "listed"
            ? "1px solid color-mix(in srgb, var(--kk-theme-dark) 30%, transparent)"
            : "1px solid transparent",
        outlineOffset: "-1px",
        boxShadow: isOver
          ? undefined
          : col.stage === "listed"
            ? "0 0 0 1px color-mix(in srgb, var(--kk-theme-dark) 22%, transparent), 0 0 14px 5px color-mix(in srgb, var(--kk-theme-dark) 18%, transparent)"
            : "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        ...extraStyle,
      }}
    >
      <div className="kk-board-col-header" style={{ borderBottomColor: col.soft, ...(col.stage === "listed" ? { background: "color-mix(in srgb, var(--kk-theme-dark) 8%, var(--kk-surface))" } : {}) }}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: col.soft, color: col.ink }}>
            <Icon className="w-3 h-3" />
          </span>
          <span className="kk-overline whitespace-nowrap" style={{ color: "var(--kk-ink-soft)" }}>{col.label}</span>
          <span className="ml-1 text-[11px] font-semibold tabular-nums px-1.5 rounded-full"
            style={{ color: "var(--kk-ink-mute)", background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            {count}
          </span>
          {headerExtra && <div className="ml-auto">{headerExtra}</div>}
        </div>
        <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--kk-ink-mute)" }}>{col.hint}</p>
      </div>
      <ScrollArea className="kk-board-col-body">
        <div className="kk-board-col-body-inner">{children}</div>
      </ScrollArea>
    </div>
  );
}

function EmptyDrop({ col }: { col: ColMeta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-10 px-4 text-center gap-2"
      style={{ border: "1.5px dashed var(--kk-line-strong)" }}>
      <span className="opacity-40" style={{ color: "var(--kk-ink-faint)" }}><col.Icon className="w-4 h-4" /></span>
      <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
        Drag a card here to mark as {col.label.toLowerCase()}
      </span>
    </div>
  );
}

// Pure visual snapshot used by DragOverlay — no hooks, no buttons
function CardPreview({ l }: { l: OwnerLead }) {
  const photo = l.photo_urls?.[l.cover_photo_index ?? 0];
  const propName = l.property_name ?? l.address ?? "";
  return (
    <div
      className="kk-card p-3 flex flex-col gap-2"
      style={{ width: 280, opacity: 0.96, transform: "rotate(2deg)", boxShadow: "0 16px 40px rgba(0,0,0,0.22)", cursor: "grabbing" }}
    >
      <div className="flex gap-2.5">
        <div
          className="w-[64px] h-[64px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
        >
          {photo
            ? <Image src={photo} alt="" width={64} height={64} className="w-full h-full object-cover" />
            : <Home className="w-5 h-5" style={{ color: "var(--kk-ink-faint)" }} />
          }
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
            {propName || "—"}
          </p>
          <p className="text-[11px] leading-tight">
            {l.unit && <span style={{ color: "var(--kk-ink-soft)" }}>Unit {l.unit}{l.expected_rent != null ? " · " : ""}</span>}
            {l.expected_rent != null && (
              <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {l.expected_rent.toLocaleString()}/mo</span>
            )}
            {!l.unit && !l.expected_rent && <span style={{ color: "var(--kk-ink-faint)" }}>—</span>}
          </p>
          <div className="flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
            <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>{l.owner_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


function CardContent({ l, col, tenantInfo, hasOwnerRanking, onCommission, onConfirmMovedIn, onTenantConfirmed, onCompetitorRented }: { l: OwnerLead; col: ColMeta; tenantInfo?: TenantInfo; hasOwnerRanking: boolean; onCommission: (tenancyId: string) => void; onConfirmMovedIn: (info: TenantInfo) => void; onTenantConfirmed: () => void; onCompetitorRented: () => void }) {
  const photo = l.photo_urls?.[l.cover_photo_index ?? 0];
  const propName = l.property_name ?? l.address ?? "";
  return (
    <>
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
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
            {propName || "—"}
          </p>

          <p className="text-[11px] leading-tight">
            {l.unit && <span style={{ color: "var(--kk-ink-soft)" }}>Unit {l.unit}{l.expected_rent != null ? " · " : ""}</span>}
            {l.expected_rent != null && (
              <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {l.expected_rent.toLocaleString()}/mo</span>
            )}
            {!l.unit && !l.expected_rent && (
              <span style={{ color: "var(--kk-ink-faint)" }}>—</span>
            )}
          </p>

          {l.listing_purpose && (
            <div className="flex gap-1 flex-wrap">
              {(l.listing_purpose === "rent" || l.listing_purpose === "both") && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)" }}>Rent</span>
              )}
              {(l.listing_purpose === "sell" || l.listing_purpose === "both") && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.10)", color: "#7C3AED" }}>Sale</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>{l.owner_name}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {l.available_from && (
                <div className="flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" style={{ color: "var(--kk-ink-faint)" }} />
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                    {formatAvailDate(l.available_from)}
                  </span>
                </div>
              )}
              {hasOwnerRanking && (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#1F8B4C" }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {col.stage === "matched" && tenantInfo && (
        <div className="rounded-xl px-3 py-2 space-y-1" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
            <span className="text-[12px] font-semibold truncate" style={{ color: "var(--kk-ink)" }}>{tenantInfo.tenant_name}</span>
          </div>
          {tenantInfo.contract_start && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
                {fmtDate(tenantInfo.contract_start)}
                {tenantInfo.contract_end ? ` — ${fmtDate(tenantInfo.contract_end)}` : ""}
                {tenantInfo.contract_duration_months ? ` · ${tenantInfo.contract_duration_months}mo` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      <CardAction l={l} stage={col.stage} tenantInfo={tenantInfo} hasOwnerRanking={hasOwnerRanking} onCommission={onCommission} onConfirmMovedIn={onConfirmMovedIn} onTenantConfirmed={onTenantConfirmed} onCompetitorRented={onCompetitorRented} />
    </>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function Card({ l, col, isDragging, onEdit, tenantInfo, hasOwnerRanking, onCommission, onConfirmMovedIn, onTenantConfirmed, onCompetitorRented }: { l: OwnerLead; col: ColMeta; isDragging: boolean; onEdit: () => void; tenantInfo?: TenantInfo; hasOwnerRanking: boolean; onCommission: (tenancyId: string) => void; onConfirmMovedIn: (info: TenantInfo) => void; onTenantConfirmed: () => void; onCompetitorRented: () => void }) {
  const ph = usePostHog();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: l.id });
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress() {
    pressTimer.current = setTimeout(() => setPressing(true), 150);
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setPressing(false);
  }

  const cardStyle: React.CSSProperties = {
    opacity: isDragging ? 0.2 : 1,
    ...(col.stage === "listed" && !isDragging ? { boxShadow: "0 4px 14px color-mix(in srgb, var(--kk-theme-dark) 18%, transparent), 0 1px 4px rgba(0,0,0,0.06)" } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      data-card-id={l.id}
      {...attributes}
      {...listeners}
      onTouchStart={(e) => { listeners?.onTouchStart?.(e); startPress(); }}
      onTouchEnd={(e) => { listeners?.onTouchEnd?.(e); cancelPress(); }}
      onTouchCancel={(e) => { listeners?.onTouchCancel?.(e); cancelPress(); }}
      style={cardStyle}
      className={`kk-card ${!isDragging ? "kk-card-hover" : ""} ${pressing && !isDragging ? "kk-card-shake" : ""} p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing touch-none select-none`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-card-action]")) return;
        if (target.closest("[role='dialog']")) return;
        if (target.closest("[data-radix-popper-content-wrapper]")) return;
        track(ph, "card_opened", { type: "owner_lead", card_id: l.id, col: col.stage });
        onEdit();
      }}
    >
      <CardContent l={l} col={col} tenantInfo={tenantInfo} hasOwnerRanking={hasOwnerRanking} onCommission={onCommission} onConfirmMovedIn={onConfirmMovedIn} onTenantConfirmed={onTenantConfirmed} onCompetitorRented={onCompetitorRented} />
    </div>
  );
}

function CardAction({ l, stage, tenantInfo, hasOwnerRanking, onCommission, onConfirmMovedIn, onTenantConfirmed, onCompetitorRented }: { l: OwnerLead; stage: Stage; tenantInfo?: TenantInfo; hasOwnerRanking: boolean; onCommission: (tenancyId: string) => void; onConfirmMovedIn: (info: TenantInfo) => void; onTenantConfirmed: () => void; onCompetitorRented: () => void }) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { gateOpen, setGateOpen, missingFields, checkAndRun } = useWhatsAppGate();

  function ping(template: "outreach_initial" | "outreach_followup" | "collect_details", advanceTo?: Stage) {
    checkAndRun(() => {
      startTransition(async () => {
        const res = await sendOwnerOutreach(l.id, template);
        if (!res.ok) { toast.error(res.message); return; }
        window.open(res.url, "_blank", "noopener,noreferrer");
        track(ph, "whatsapp_sent", { type: "owner", template });
        if (advanceTo) await setOwnerLeadStage(l.id, advanceTo);
        router.refresh();
        toast.success("Message ready in WhatsApp");
      });
    });
  }

  if (stage === "imported") {
    const count = l.outreach_count ?? 0;

    async function moveToListed() {
      await setOwnerLeadStage(l.id, "listed");
      router.refresh();
      toast.success("Moved to Listed!");
    }

    function sendIntakeForm() {
      checkAndRun(() => {
        startTransition(async () => {
          const res = await generateOwnerIntakeLink(l.id);
          if (!res.ok) { toast.error(res.message); return; }
          window.open(res.waUrl, "_blank", "noopener,noreferrer");
          router.refresh();
          toast.success("WhatsApp ready to send");
        });
      });
    }

    if (l.intake_completed_at) {
      return (
        <>
          <div className="space-y-2">
            <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--kk-ink-mute)" }}>
              <Check className="w-3 h-3" style={{ color: "var(--kk-green)" }} /> Form completed. Review details.
            </span>
            <button
              type="button" data-card-action
              onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
              disabled={pending}
              className="kk-card-cta"
              style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.30)", color: "#1F8B4C" }}
            >
              <span className="flex items-start gap-1.5 min-w-0 flex-1">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Confirm details</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            </button>
          </div>
          <ConfirmListedDialog
            open={confirming}
            onOpenChange={setConfirming}
            ownerName={l.owner_name}
            propertyName={l.property_name ?? null}
            unit={l.unit ?? null}
            onConfirm={moveToListed}
          />
        </>
      );
    }

    return (
      <>
        <div className="space-y-2">
          {count > 0 && <OutreachCountBadge count={count} />}
          <button
            type="button" data-card-action
            onClick={(e) => { e.stopPropagation(); sendIntakeForm(); }}
            disabled={pending}
            className="kk-card-cta kk-card-cta-soft-green"
          >
            <span className="flex items-start gap-1.5 min-w-0 flex-1">
              {pending ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" /> : <WhatsAppIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span>Send property form</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          </button>
        </div>
        <WhatsAppGateDialog open={gateOpen} onOpenChange={setGateOpen} missingFields={missingFields} />
      </>
    );
  }
  if (stage === "listed") {
    return (
      <div className="space-y-2">
        {hasOwnerRanking && (
          <Link
            href={`/matching/${l.id}`}
            data-card-action
            onClick={(e) => e.stopPropagation()}
            className="kk-card-cta flex items-center justify-between w-full"
            style={{ background: "#34C759", color: "#fff", border: "none" }}
          >
            <span className="flex items-start gap-1.5 min-w-0 flex-1">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Review owner&apos;s response</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          </Link>
        )}
        <button
          type="button"
          data-card-action
          onClick={(e) => { e.stopPropagation(); onTenantConfirmed(); }}
          className="kk-card-cta kk-card-cta-soft-green flex items-center justify-between w-full"
          style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.30)", color: "#1F8B4C" }}
        >
          <span className="flex items-start gap-1.5 min-w-0 flex-1">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Tenant confirmed</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        </button>
        <Link
          href={`/matching/${l.id}`}
          data-card-action
          onClick={(e) => e.stopPropagation()}
          className="kk-card-cta kk-card-cta-soft-green flex items-center justify-between w-full"
        >
          <span className="flex items-start gap-1.5 min-w-0 flex-1">
            <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Build tenant pack</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        </Link>
      </div>
    );
  }
  if (stage === "matched") {
    const isReserved = tenantInfo?.lifecycle_stage === "reserved";
    return (
      <button
        type="button"
        data-card-action
        onClick={(e) => {
          e.stopPropagation();
          if (tenantInfo && isReserved) {
            onConfirmMovedIn(tenantInfo);
          } else if (tenantInfo) {
            onCommission(tenantInfo.tenancy_id);
          } else {
            startTransition(async () => {
              await setOwnerLeadStage(l.id, "archived");
              router.refresh();
              toast.success("Marked as moved in.");
            });
          }
        }}
        disabled={pending}
        className="kk-card-cta kk-card-cta-soft-green flex items-center justify-between w-full"
      >
        <span className="flex items-start gap-1.5 min-w-0 flex-1">
          {pending ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <span>{isReserved ? "Confirm moved in" : "Moved in"}</span>
        </span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      </button>
    );
  }
  return null;
}

// ─── Outreach count badge ──────────────────────────────────────────────────────

const COUNT_STYLES: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: "#FEF3C7", color: "#92400E", label: "Sent" },
  2: { bg: "#FFEDD5", color: "#9A3412", label: "Sent twice" },
};
const COUNT_MANY = { bg: "#FEE2E2", color: "#991B1B", label: "Sent thrice or more" };

function outreachStyle(count: number) {
  return COUNT_STYLES[count] ?? COUNT_MANY;
}

function OutreachCountBadge({ count }: { count: number }) {
  const s = outreachStyle(count);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Bulk send dialog — compact table with daily batching ─────────────────────

function BulkSendDialog({ leads, onClose }: { leads: OwnerLead[]; onClose: () => void }) {
  const [batchSize, setBatchSize] = useState<50 | 100>(50);
  const [sending, setSending] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // All contactable imported leads in import order (oldest first)
  const pool = [...leads]
    .filter((l) => l.stage === "imported" && !l.intake_completed_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Split: today's batch = first N (unsent first within the batch for better UX)
  const rawBatch = pool.slice(0, batchSize);
  const futureBatch = pool.slice(batchSize, batchSize * 2);
  const futureRemaining = pool.slice(batchSize * 2);

  // Sort today's batch: unsent first, then sent — stable within each group
  const todaysBatch = [
    ...rawBatch.filter((l) => (l.outreach_count ?? 0) === 0 && !justSent.has(l.id)),
    ...rawBatch.filter((l) => (l.outreach_count ?? 0) > 0 || justSent.has(l.id)),
  ];

  const todaysSentCount = rawBatch.filter((l) => (l.outreach_count ?? 0) > 0 || justSent.has(l.id)).length;
  const todaysUnsent = todaysBatch.filter((l) => (l.outreach_count ?? 0) === 0 && !justSent.has(l.id));
  const batchDone = todaysUnsent.length === 0 && rawBatch.length > 0;
  const totalContacted = pool.filter((l) => (l.outreach_count ?? 0) > 0).length;

  async function sendLead(id: string) {
    if (sending) return;
    setSending(id);
    try {
      const res = await generateOwnerIntakeLink(id);
      if (!res.ok) { toast.error(res.message); return; }
      window.open(res.waUrl, "_blank", "noopener,noreferrer");
      setJustSent((prev) => new Set([...prev, id]));
      router.refresh();
    } finally {
      setSending(null);
    }
  }

  function sendNext() {
    if (todaysUnsent[0]) sendLead(todaysUnsent[0].id);
  }

  const pct = rawBatch.length > 0 ? (todaysSentCount / rawBatch.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.50)" }} />
      <div
        className="relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: "var(--kk-surface)", maxHeight: "88dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: "var(--kk-line)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Batch outreach</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              {pool.length} leads · {totalContacted} contacted total
            </p>
          </div>
          {/* Batch size toggle */}
          <div className="flex items-center rounded-full p-0.5 shrink-0" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
            {([50, 100] as const).map((n) => (
              <button
                key={n}
                onClick={() => setBatchSize(n)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={batchSize === n ? { background: "var(--kk-ink)", color: "#fff" } : { color: "var(--kk-ink-mute)" }}
              >
                {n}/day
              </button>
            ))}
          </div>
          {!batchDone && todaysUnsent.length > 0 && (
            <button
              onClick={sendNext}
              disabled={!!sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold shrink-0 disabled:opacity-50"
              style={{ background: "#25D366", color: "#fff" }}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WhatsAppIcon className="w-3.5 h-3.5" />}
              Next ({todaysUnsent.length} left)
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-70"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* Today's batch section header */}
          <div className="sticky top-0 z-10 px-5 py-2 flex items-center gap-3" style={{ background: "var(--kk-surface)", borderBottom: "1px solid var(--kk-line)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--kk-ink-mute)" }}>
              Today&apos;s batch
            </span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-faint)" }}>
              {todaysSentCount} / {rawBatch.length} sent
            </span>
            <div className="flex-1 h-1 rounded-full overflow-hidden min-w-0" style={{ background: "var(--kk-surface-2)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "var(--kk-green)" }} />
            </div>
            {batchDone && (
              <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--kk-green)" }}>Done ✓</span>
            )}
          </div>

          {/* Today's batch rows */}
          {pool.length === 0 ? (
            <p className="text-center py-12 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>No leads to contact.</p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {todaysBatch.map((l) => {
                  const count = l.outreach_count ?? 0;
                  const isSentNow = justSent.has(l.id);
                  const isSending = sending === l.id;
                  const sent = count > 0 || isSentNow;
                  return (
                    <tr
                      key={l.id}
                      style={{ borderBottom: "1px solid var(--kk-line)", background: sent ? "var(--kk-green-soft)" : undefined }}
                    >
                      <td className="pl-5 pr-2 py-2.5 w-[45%]">
                        <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--kk-ink)" }}>{l.owner_name}</p>
                        {l.property_name && (
                          <p className="text-[11px] leading-tight truncate" style={{ color: "var(--kk-ink-mute)" }}>{l.property_name}</p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 w-28">
                        {count > 0 && <OutreachCountBadge count={count} />}
                      </td>
                      <td className="pr-5 py-2.5 text-right">
                        <button
                          onClick={() => sendLead(l.id)}
                          disabled={!!sending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                          style={{ background: "#25D366", color: "#fff" }}
                        >
                          {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <WhatsAppIcon className="w-3 h-3" />}
                          Send
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Next batch — greyed preview */}
          {futureBatch.length > 0 && (
            <>
              <div className="px-5 py-2 flex items-center gap-2 sticky top-[41px] z-10"
                style={{ borderTop: "2px solid var(--kk-line)", borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-ink-faint)" }}>
                  Next batch
                </span>
                <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{futureBatch.length} leads</span>
                <span className="ml-auto text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                  {batchDone ? "Send tomorrow" : "Complete today's batch first"}
                </span>
              </div>
              <table className="w-full border-collapse" style={{ opacity: 0.38 }}>
                <tbody>
                  {futureBatch.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--kk-line)" }}>
                      <td className="pl-5 pr-2 py-2.5 w-[45%]">
                        <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--kk-ink)" }}>{l.owner_name}</p>
                        {l.property_name && (
                          <p className="text-[11px] leading-tight truncate" style={{ color: "var(--kk-ink-mute)" }}>{l.property_name}</p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 w-28" />
                      <td className="pr-5 py-2.5" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Future batches summary */}
          {futureRemaining.length > 0 && (
            <div className="px-5 py-4 text-center" style={{ borderTop: "1px solid var(--kk-line)" }}>
              <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
                +{futureRemaining.length} more leads across {Math.ceil(futureRemaining.length / batchSize)} future batches
              </p>
            </div>
          )}

          {/* All done */}
          {batchDone && futureBatch.length === 0 && (
            <div className="px-5 py-5 text-center" style={{ borderTop: "1px solid var(--kk-line)" }}>
              <p className="text-[13px] font-medium" style={{ color: "var(--kk-green)" }}>
                All {pool.length} leads contacted!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
