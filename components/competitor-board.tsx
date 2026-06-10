"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { OwnerLead, CompetitorStage, daysUntil } from "@/lib/types";
import { setCompetitorStageAction, winCompetitorUnitAction, archiveCompetitorLeadAction, buildCompetitorOwnerPing } from "@/lib/actions";
import { FilterSelect } from "@/components/filter-select";
import { CompetitorTimeline } from "@/components/competitor-timeline";
import { EditCompetitorDialog } from "@/components/edit-competitor-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye, Clock, MessageCircle, CheckCircle2, Home, User, Calendar, ArrowRight, Banknote, Lock, ChevronDown, Loader2, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { toast } from "sonner";

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColMeta {
  stage: "reach_out" | "watching";
  label: string;
  hint: string;
  dot: string;
  soft: string;
  ink: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const COLUMNS: ColMeta[] = [
  {
    stage: "reach_out",
    label: "Expiring",
    hint: "60 days or less. Use 'What's next?' on the card to choose the outcome.",
    dot: "#B45309",
    soft: "rgba(251,191,36,0.10)",
    ink: "#B45309",
    Icon: Clock,
  },
  {
    stage: "watching",
    label: "Watching",
    hint: "Tracking — auto-moves to Expiring 60 days before contract end.",
    dot: "var(--kk-ink-faint)",
    soft: "var(--kk-surface-2)",
    ink: "var(--kk-ink-mute)",
    Icon: Eye,
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function effectiveColumn(lead: OwnerLead, today: Date): "reach_out" | "watching" {
  const stored = (lead.competitor_stage ?? "watching") as CompetitorStage;
  // in_talks/missed are removed from UI — treat as watching
  if (stored === "in_talks" || stored === "missed") return "watching";
  if (stored === "reach_out") return "reach_out";
  // watching: auto-promote to expiring if within 60 days
  if (lead.competitor_contract_end && daysUntil(lead.competitor_contract_end, today) <= 60) return "reach_out";
  return "watching";
}

function normalizePropName(name: string): string {
  return name.toLowerCase().trim();
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} '${String(y).slice(2)}`;
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface Props {
  leads: OwnerLead[];
}

export function CompetitorBoard({ leads }: Props) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingLead, setDraggingLead] = useState<OwnerLead | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [pendingMove, setPendingMove] = useState<{ lead: OwnerLead; target: "reach_out" | "watching" } | null>(null);
  const [editLead, setEditLead] = useState<OwnerLead | null>(null);

  const [local, setLocal] = useState<OwnerLead[]>(leads);
  useEffect(() => { setLocal(leads); }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

  const propertyOptions = useMemo(() => {
    const seen = new Map<string, { orig: string; count: number }>();
    local.forEach((l) => {
      if (!l.property_name) return;
      const n = normalizePropName(l.property_name);
      const cur = seen.get(n);
      seen.set(n, { orig: cur?.orig ?? l.property_name, count: (cur?.count ?? 0) + 1 });
    });
    return [
      { value: "all", label: "All properties" },
      ...Array.from(seen.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([n, { orig, count }]) => ({ value: n, label: `${orig} (${count})` })),
    ];
  }, [local]);

  const byStage = useMemo(() => {
    const out: Record<"reach_out" | "watching", OwnerLead[]> = { reach_out: [], watching: [] };
    local
      .filter((l) => propertyFilter === "all" || normalizePropName(l.property_name ?? "") === propertyFilter)
      .filter((l) => !monthFilter || l.competitor_contract_end?.slice(0, 7) === monthFilter)
      .forEach((l) => {
        out[effectiveColumn(l, today)].push(l);
      });
    Object.values(out).forEach((arr) =>
      arr.sort((a, b) => (a.competitor_contract_end ?? "").localeCompare(b.competitor_contract_end ?? ""))
    );
    return out;
  }, [local, today, propertyFilter, monthFilter]);

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    setDraggingLead(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const target = String(e.over.id) as "reach_out" | "watching";
    if (target !== "reach_out" && target !== "watching") return;
    const lead = local.find((x) => x.id === id);
    if (!lead) return;
    if (effectiveColumn(lead, today) === target) return;
    setPendingMove({ lead, target });
  }

  async function confirmMove() {
    if (!pendingMove) return;
    const { lead, target } = pendingMove;
    setPendingMove(null);
    setLocal((prev) => prev.map((x) => x.id === lead.id ? { ...x, competitor_stage: target } : x));
    const res = await setCompetitorStageAction(lead.id, target);
    if (!res.ok) { setLocal(leads); toast.error("Could not move card"); }
    else router.refresh();
  }

  async function handleWin(id: string) {
    setLocal((prev) => prev.filter((x) => x.id !== id));
    await winCompetitorUnitAction(id);
    toast.success("Won! Card moved to Existing listing.");
    router.refresh();
  }

  async function handleBackToWatching(id: string) {
    setLocal((prev) => prev.map((x) => x.id === id ? { ...x, competitor_stage: "watching" as CompetitorStage } : x));
    await setCompetitorStageAction(id, "watching");
    router.refresh();
  }

  async function handleArchive(id: string) {
    setLocal((prev) => prev.filter((x) => x.id !== id));
    await archiveCompetitorLeadAction(id);
    toast.success("Removed from target list.");
    router.refresh();
  }

  return (
    <>
      {/* Chart */}
      <div className="kk-section p-5 mb-5">
        <div className="mb-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>
            See when competitor contracts are up for renewal, month by month
          </p>
        </div>
        <CompetitorTimeline
          leads={local.filter((l) =>
            propertyFilter === "all" || normalizePropName(l.property_name ?? "") === propertyFilter
          )}
          selectedMonth={monthFilter}
          onMonthClick={(key) => setMonthFilter((prev) => prev === key ? "" : key)}
        />
      </div>

      <div ref={boardRef} style={{ scrollMarginTop: 80 }} />

      <DndContext
        id="kakisewa-competitor"
        sensors={sensors}
        onDragStart={(e) => {
          const id = String(e.active.id);
          setDraggingId(id);
          setDraggingLead(local.find((x) => x.id === id) ?? null);
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setDraggingId(null); setDraggingLead(null); }}
      >
        {/* Filter row */}
        <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <FilterSelect
            value={propertyFilter}
            onChange={setPropertyFilter}
            options={propertyOptions}
            minWidth={160}
          />
        </div>

        <div className="kk-board-shell -mx-3 lg:-mx-5">
          <div className="kk-board-row px-3 lg:px-5">
            {COLUMNS.map((col) => {
              const cards = byStage[col.stage];
              const isExpiring = col.stage === "reach_out";

              const columnContent = cards.length === 0
                ? <EmptyDrop col={col} />
                : cards.map((l) => (
                    <Card
                      key={l.id}
                      lead={l}
                      col={col}
                      today={today}
                      isDragging={draggingId === l.id}
                      onOpen={() => setEditLead(l)}
                      onWin={handleWin}
                      onBackToWatching={handleBackToWatching}
                      onArchive={handleArchive}
                    />
                  ));

              if (isExpiring) {
                return (
                  <div key={col.stage} style={{ position: "relative", flex: 2, minWidth: 380, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ position: "absolute", top: -50, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, background: "var(--kk-theme-dark)", borderRadius: 22, padding: "10px 20px", boxShadow: "0 4px 14px color-mix(in srgb, var(--kk-theme-dark) 30%, transparent), 0 1px 4px rgba(0,0,0,0.10)" }}>
                        <Banknote className="w-4 h-4" style={{ color: "#fff" }} />
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Win this unit before they renew!</span>
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
          {draggingLead ? <CardPreview lead={draggingLead} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Drag confirmation */}
      {pendingMove && (
        <Dialog open onOpenChange={(v) => { if (!v) setPendingMove(null); }}>
          <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                  Move to {COLUMNS.find((c) => c.stage === pendingMove.target)?.label ?? pendingMove.target}?
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                  {pendingMove.lead.owner_name} · {pendingMove.lead.property_name}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPendingMove(null)} className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2">
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  className="flex-1 flex items-center justify-center text-[13px] font-semibold py-2 rounded-full"
                  style={{ background: COLUMNS.find((c) => c.stage === pendingMove.target)?.ink ?? "var(--kk-ink)", color: "#fff" }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit dialog */}
      {editLead && (
        <EditCompetitorDialog
          lead={editLead}
          open={!!editLead}
          onOpenChange={(o) => { if (!o) setEditLead(null); }}
        />
      )}
    </>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ col, count, children, extraStyle }: { col: ColMeta; count: number; children: React.ReactNode; extraStyle?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.stage });
  const Icon = col.Icon;
  const isExpiring = col.stage === "reach_out";

  return (
    <div
      ref={setNodeRef}
      id={`kk-col-${col.stage}`}
      className="kk-board-col"
      style={{
        background: isOver
          ? col.soft
          : isExpiring
            ? "radial-gradient(ellipse 110% 70% at 50% 25%, color-mix(in srgb, var(--kk-theme-dark) 18%, transparent) 0%, color-mix(in srgb, var(--kk-theme-dark) 8%, transparent) 40%, var(--kk-surface) 68%)"
            : "var(--kk-surface)",
        outline: isOver
          ? `2px solid ${col.ink}`
          : isExpiring
            ? "1px solid color-mix(in srgb, var(--kk-theme-dark) 30%, transparent)"
            : "1px solid transparent",
        outlineOffset: "-1px",
        boxShadow: isOver
          ? undefined
          : isExpiring
            ? "0 0 0 1px color-mix(in srgb, var(--kk-theme-dark) 22%, transparent), 0 0 14px 5px color-mix(in srgb, var(--kk-theme-dark) 15%, transparent)"
            : "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        ...extraStyle,
      }}
    >
      <div
        className="kk-board-col-header"
        style={{
          borderBottomColor: col.soft,
          ...(isExpiring ? { background: "color-mix(in srgb, var(--kk-theme-dark) 8%, var(--kk-surface))" } : {}),
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
      <div className="kk-board-col-body">{children}</div>
    </div>
  );
}

// ─── EmptyDrop ────────────────────────────────────────────────────────────────

function EmptyDrop({ col }: { col: ColMeta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-8 px-3 text-center text-[12px] gap-1"
      style={{ background: "var(--kk-surface)", border: "1px dashed var(--kk-line-strong)", color: "var(--kk-ink-faint)" }}>
      <span>Drop here</span>
      <span className="text-[10px] uppercase tracking-wider">to move into {col.label.toLowerCase()}</span>
    </div>
  );
}

// ─── Card preview (DragOverlay) ───────────────────────────────────────────────

function CardPreview({ lead }: { lead: OwnerLead }) {
  const photo = lead.photo_urls?.[lead.cover_photo_index ?? 0];
  return (
    <div className="kk-card p-3 flex flex-col gap-2"
      style={{ width: 280, opacity: 0.96, transform: "rotate(2deg)", boxShadow: "0 16px 40px rgba(0,0,0,0.22)", cursor: "grabbing" }}>
      <div className="flex gap-2.5">
        <div className="w-[64px] h-[64px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover" />
            : <Home className="w-5 h-5" style={{ color: "var(--kk-ink-faint)" }} />}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
            {lead.property_name || "—"}
          </p>
          <p className="text-[11px] leading-tight">
            {lead.unit && <span style={{ color: "var(--kk-ink-soft)" }}>Unit {lead.unit} · </span>}
            {lead.expected_rent != null
              ? <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {lead.expected_rent.toLocaleString()}/mo</span>
              : <span style={{ color: "var(--kk-ink-faint)" }}>Rent unknown</span>}
          </p>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
            <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>{lead.owner_name ?? "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ lead, col, today, isDragging, onOpen, onWin, onBackToWatching, onArchive }: {
  lead: OwnerLead;
  col: ColMeta;
  today: Date;
  isDragging: boolean;
  onOpen: () => void;
  onWin: (id: string) => void;
  onBackToWatching: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id });
  const isExpiring = col.stage === "reach_out";

  const cardStyle: React.CSSProperties = isDragging ? { opacity: 0.2 } : {};
  if (isExpiring && !isDragging) {
    cardStyle.boxShadow = "0 4px 14px color-mix(in srgb, var(--kk-theme-dark) 14%, transparent), 0 1px 4px rgba(0,0,0,0.06)";
  }

  const days = lead.competitor_contract_end ? daysUntil(lead.competitor_contract_end, today) : null;
  const daysBg    = days === null ? "var(--kk-surface-2)" : days < 0 ? "var(--kk-surface-2)" : days <= 30 ? "var(--kk-red-soft)"   : days <= 60 ? "var(--kk-amber-soft)" : "var(--kk-surface-2)";
  const daysColor = days === null ? "var(--kk-ink-faint)" : days < 0 ? "var(--kk-ink-mute)" : days <= 30 ? "#C62828"              : days <= 60 ? "#B45309"              : "var(--kk-ink-mute)";
  const daysLabel = days === null ? "—" : days < 0 ? `${Math.abs(days)}d over` : days === 0 ? "Today" : `${days}d`;

  const photo = lead.photo_urls?.[lead.cover_photo_index ?? 0];

  return (
    <div
      ref={setNodeRef}
      data-card-id={lead.id}
      {...attributes}
      {...listeners}
      style={cardStyle}
      className={`kk-card ${!isDragging ? "kk-card-hover" : ""} p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing touch-none select-none`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-card-action]")) return;
        onOpen();
      }}
    >
      {/* Photo + info */}
      <div className="flex gap-2.5">
        <div className="w-[64px] h-[64px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <Home className="w-5 h-5" style={{ color: "var(--kk-ink-faint)" }} />}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
              {lead.property_name || "—"}
            </p>
            {days !== null && (
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: daysBg, color: daysColor }}>
                {daysLabel}
              </span>
            )}
          </div>

          <p className="text-[11px] leading-tight">
            {lead.unit && <span style={{ color: "var(--kk-ink-soft)" }}>Unit {lead.unit} · </span>}
            {lead.expected_rent != null
              ? <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {lead.expected_rent.toLocaleString()}/mo</span>
              : <span style={{ color: "var(--kk-ink-faint)" }}>Rent unknown</span>}
            {(lead.bedrooms != null || lead.bathrooms != null) && (
              <span style={{ color: "var(--kk-ink-faint)" }}>
                {" · "}
                {lead.bedrooms != null ? `${lead.bedrooms}bd` : ""}
                {lead.bedrooms != null && lead.bathrooms != null ? " " : ""}
                {lead.bathrooms != null ? `${lead.bathrooms}ba` : ""}
              </span>
            )}
          </p>

          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>
                {lead.owner_name ?? "Owner unknown"}
              </p>
            </div>
            {lead.competitor_contract_end && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Calendar className="w-2.5 h-2.5" style={{ color: "var(--kk-ink-faint)" }} />
                <span className="text-[10px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                  {formatDate(lead.competitor_contract_end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions — only on Expiring column */}
      {isExpiring && (
        <>
          <MessageOwnerAction lead={lead} />
          <ExpiringWhatsNext
            lead={lead}
            onWin={onWin}
            onBackToWatching={onBackToWatching}
            onArchive={onArchive}
          />
        </>
      )}
    </div>
  );
}

// ─── Message owner action ─────────────────────────────────────────────────────

function MessageOwnerAction({ lead }: { lead: OwnerLead }) {
  const [pending, startTransition] = useTransition();
  if (!lead.owner_phone) return null;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await buildCompetitorOwnerPing(lead.id);
      if (res) window.open(res.url, "_blank", "noopener");
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
          : <WhatsAppIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <span>Message owner</span>
      </span>
      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    </button>
  );
}

// ─── "What's next?" for Expiring cards ───────────────────────────────────────

type ExpiringOutcome = "" | "win" | "back" | "archive";

const EXPIRING_OUTCOMES: Record<Exclude<ExpiringOutcome, "">, {
  label: string;
  description: string;
  confirm: string;
  soft: string;
  ink: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  win: {
    label: "Owner rents with me",
    description: "Move this unit to Existing listing. You've won it.",
    confirm: "Yes, move to Existing listing",
    soft: "rgba(52,199,89,0.12)",
    ink: "#1F8B4C",
    Icon: CheckCircle2,
  },
  back: {
    label: "Owner doesn't rent",
    description: "Move back to Watching. You can follow up again later.",
    confirm: "Move back to Watching",
    soft: "var(--kk-surface-2)",
    ink: "var(--kk-ink-mute)",
    Icon: Eye,
  },
  archive: {
    label: "Owner own stay",
    description: "The owner will occupy the unit. Remove it from your target list.",
    confirm: "Remove from target list",
    soft: "var(--kk-surface-2)",
    ink: "var(--kk-ink-faint)",
    Icon: Lock,
  },
};

function ExpiringWhatsNext({ lead, onWin, onBackToWatching, onArchive }: {
  lead: OwnerLead;
  onWin: (id: string) => void;
  onBackToWatching: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const [choice, setChoice] = useState<ExpiringOutcome>("");
  const [confirming, setConfirming] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onDown(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [dropdownOpen]);

  function onSelectChange(val: ExpiringOutcome) {
    setDropdownOpen(false);
    setChoice(val);
    if (val) setConfirming(true);
  }

  function handleConfirm() {
    setConfirming(false);
    setChoice("");
    if (choice === "win")     onWin(lead.id);
    if (choice === "back")    onBackToWatching(lead.id);
    if (choice === "archive") onArchive(lead.id);
  }

  const meta = choice ? EXPIRING_OUTCOMES[choice] : null;

  return (
    <>
      <div
        data-card-action
        className="flex flex-col gap-2 pt-2"
        style={{ borderTop: "1px solid var(--kk-line)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div ref={dropdownRef} className="relative shrink-0 inline-block">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 text-[12px] pl-3 pr-2.5 py-1.5 rounded-lg"
            style={{
              background: "var(--kk-surface-2)",
              color: choice ? "var(--kk-ink)" : "var(--kk-ink-faint)",
              border: "1px solid var(--kk-line)",
            }}
          >
            {choice ? EXPIRING_OUTCOMES[choice].label : "What's next?"}
            <ChevronDown className="w-3 h-3 shrink-0 transition-transform" style={{ color: "var(--kk-ink-faint)", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
              style={{ background: "#fff", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200 }}
            >
              {(["win", "back", "archive"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSelectChange(val)}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--kk-surface-2)] transition-colors"
                  style={{ color: "var(--kk-ink)" }}
                >
                  {EXPIRING_OUTCOMES[val].label}
                </button>
              ))}
            </div>
          )}
        </div>
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
                    <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{lead.owner_name} · {lead.property_name}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setConfirming(false); setChoice(""); }} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-faint)" }}>
                  <XCircle className="w-4 h-4" />
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
