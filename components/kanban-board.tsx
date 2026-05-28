"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Tenancy, RentPayment, ActionStage, computeActionStage } from "@/lib/types";

// Mirrors the server-side transition logic so we can update the UI
// optimistically before the server roundtrip completes.
function applyStageTransition(t: Tenancy, target: ActionStage): Tenancy {
  switch (target) {
    case "owing":
    case "nearing":
      return { ...t, status: "Pending", current_month_paid: false, current_month_receipt_url: null, forwarded_at: null };
    case "pending_verify":
      return { ...t, status: "Paid - Pending Verification", current_month_paid: false, forwarded_at: null };
    case "awaiting_forward":
      return { ...t, status: "Verified", current_month_paid: true, forwarded_at: null };
    case "completed":
      return { ...t, status: "Verified", current_month_paid: true, forwarded_at: new Date().toISOString() };
  }
}
import { setActionStage, markReminderSent, runAiVerification, markForwardedToOwner } from "@/lib/actions";
import { TenancyDetailDialog } from "@/components/tenancy-detail-dialog";
import { AdvanceConfirmDialog } from "@/components/advance-confirm-dialog";
import { buildWhatsAppPingUrl, buildWhatsAppForwardUrl } from "@/lib/whatsapp";
import { ArrowRight, Sparkles, Send, Check, X as XIcon, Clock, AlertTriangle, Receipt, ShieldCheck, CircleCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { toast } from "sonner";

type ColMeta = {
  stage: ActionStage;
  label: string;
  shortLabel: string;
  dot: string;
  soft: string;
  ink: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
};

const COLUMNS: ColMeta[] = [
  { stage: "owing",            label: "Owing",            shortLabel: "Owing",        dot: "var(--kk-red)",    soft: "var(--kk-red-soft)",    ink: "#C62828",          borderColor: "rgba(255,59,48,0.20)",   icon: AlertTriangle, hint: "Past due. Chase now." },
  { stage: "nearing",          label: "Due soon",         shortLabel: "Due soon",     dot: "var(--kk-amber)",  soft: "var(--kk-amber-soft)",  ink: "#B45309",          borderColor: "rgba(255,149,0,0.22)",   icon: Clock,         hint: "Coming up. Send an early ping." },
  { stage: "pending_verify",   label: "Pending verify",   shortLabel: "Verify",       dot: "var(--kk-blue)",   soft: "var(--kk-blue-soft)",   ink: "var(--kk-blue)",   borderColor: "rgba(0,113,227,0.20)",   icon: Receipt,       hint: "Receipt uploaded. Verify it." },
  { stage: "awaiting_forward", label: "Awaiting forward", shortLabel: "Forward",      dot: "var(--kk-purple)", soft: "var(--kk-purple-soft)", ink: "#6F2DA8",          borderColor: "rgba(175,82,222,0.20)",  icon: ShieldCheck,   hint: "Verified. Forward to owner." },
  { stage: "completed",        label: "Completed",        shortLabel: "Completed",    dot: "var(--kk-green)",  soft: "var(--kk-green-soft)",  ink: "#1F8B4C",          borderColor: "rgba(52,199,89,0.20)",   icon: CircleCheck,   hint: "All done for the month" },
];

function colMeta(stage: ActionStage): ColMeta {
  return COLUMNS.find((c) => c.stage === stage)!;
}

interface Props {
  tenancies: Tenancy[];
  baseUrl: string;
  paymentsByTenancy: Record<string, RentPayment[]>;
  filterStage: ActionStage | null;
  onClearFilter?: () => void;
}

export function KanbanBoard({ tenancies, baseUrl, paymentsByTenancy, filterStage, onClearFilter }: Props) {
  const today = useMemo(() => new Date(), []);
  const router = useRouter();
  const [openTenancy, setOpenTenancy] = useState<Tenancy | null>(null);
  const [pendingMove, setPendingMove] = useState<{ tenancy: Tenancy; from: ActionStage; to: ActionStage } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Local copy of tenancies — updated optimistically when agent confirms a
  // move so the card reflows immediately. Synced from props on each render.
  const [localTenancies, setLocalTenancies] = useState<Tenancy[]>(tenancies);
  useEffect(() => { setLocalTenancies(tenancies); }, [tenancies]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Group tenancies by computed stage — uses optimistic local copy
  const byStage = useMemo(() => {
    const out: Record<ActionStage, Tenancy[]> = {
      owing: [], nearing: [], pending_verify: [], awaiting_forward: [], completed: [],
    };
    localTenancies.forEach((t) => {
      out[computeActionStage(t, today)].push(t);
    });
    out.owing.sort((a, b) => (today.getDate() - a.due_day) - (today.getDate() - b.due_day));
    out.nearing.sort((a, b) => a.due_day - b.due_day);
    return out;
  }, [localTenancies, today]);

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    const tenancyId = String(e.active.id);
    const target = String(e.over.id) as ActionStage;
    const tenancy = tenancies.find((t) => t.id === tenancyId);
    if (!tenancy) return;
    const from = computeActionStage(tenancy, today);
    if (from === target) return;
    setPendingMove({ tenancy, from, to: target });
  }

  async function confirmMove() {
    if (!pendingMove) return;
    const tenancyId = pendingMove.tenancy.id;
    const target = pendingMove.to;

    // Optimistic — the card moves NOW.
    setLocalTenancies((prev) =>
      prev.map((t) => (t.id === tenancyId ? applyStageTransition(t, target) : t))
    );

    const res = await setActionStage(tenancyId, target);
    if (res.ok) {
      router.refresh();
      toast.success(res.message);
    } else {
      // Server rejected — roll back to the props
      setLocalTenancies(tenancies);
      toast.error(res.message ?? "Could not move card.");
    }
  }

  const visibleColumns = filterStage ? COLUMNS.filter((c) => c.stage === filterStage) : COLUMNS;
  const gridCols =
    visibleColumns.length === 1 ? "grid-cols-1" :
    visibleColumns.length === 2 ? "grid-cols-1 md:grid-cols-2" :
    "grid-cols-1 md:grid-cols-2 xl:grid-cols-5";

  return (
    <>
      {filterStage && (
        <div className="mb-4 flex items-center gap-3">
          <span className="kk-overline" style={{ color: "var(--kk-ink-faint)" }}>Filtered to</span>
          <span className="kk-status" style={{ background: colMeta(filterStage).soft, color: colMeta(filterStage).ink, borderColor: "transparent" }}>
            {colMeta(filterStage).label}
          </span>
          <button
            onClick={onClearFilter}
            className="kk-pill kk-pill-ghost"
            style={{ padding: "0.25rem 0.7rem", fontSize: "12px" }}
          >
            <XIcon className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Stage flow header — always visible, shows the funnel */}
      {!filterStage && (
        <div className="hidden xl:grid grid-cols-5 gap-4 mb-4">
          {COLUMNS.map((c, i) => (
            <div key={c.stage} className="flex items-center gap-2 px-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums shrink-0"
                style={{ background: c.soft, color: c.ink }}
              >
                {i + 1}
              </span>
              <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{c.hint}</span>
            </div>
          ))}
        </div>
      )}

      <DndContext
        id="kakisewa-kanban"
        sensors={sensors}
        onDragStart={(e) => setDraggingId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div className={`grid ${gridCols} gap-4`}>
          {visibleColumns.map((col) => {
            const cards = byStage[col.stage];
            return (
              <Column key={col.stage} col={col} count={cards.length}>
                {cards.length === 0 ? (
                  <EmptyDrop col={col} />
                ) : (
                  cards.map((t) => (
                    <DraggableCard
                      key={t.id}
                      t={t}
                      col={col}
                      today={today}
                      baseUrl={baseUrl}
                      isDragging={draggingId === t.id}
                      onOpen={() => setOpenTenancy(t)}
                    />
                  ))
                )}
              </Column>
            );
          })}
        </div>
      </DndContext>

      <TenancyDetailDialog
        tenancy={openTenancy}
        open={!!openTenancy}
        onOpenChange={(o) => !o && setOpenTenancy(null)}
      />

      <AdvanceConfirmDialog
        open={!!pendingMove}
        onOpenChange={(o) => !o && setPendingMove(null)}
        tenantName={pendingMove?.tenancy.tenant_name ?? ""}
        fromStage={pendingMove?.from ?? null}
        toStage={pendingMove?.to ?? null}
        onConfirm={confirmMove}
      />
    </>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function Column({ col, count, children }: { col: ColMeta; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.stage });
  const Icon = col.icon;
  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-2xl p-3 transition-colors"
      style={{
        background: isOver ? col.soft : "var(--kk-surface-2)",
        outline: isOver ? `2px solid ${col.ink}` : "1px solid transparent",
        outlineOffset: "-1px",
      }}
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-3 border-b" style={{ borderColor: col.soft }}>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: col.soft, color: col.ink }}
        >
          <Icon className="w-3 h-3" />
        </span>
        <span className="kk-overline" style={{ color: "var(--kk-ink-soft)" }}>{col.shortLabel}</span>
        <span
          className="ml-auto text-[11px] font-semibold tabular-nums px-1.5 rounded-full"
          style={{ color: col.ink, background: col.soft }}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 min-h-[180px] mt-3">
        {children}
      </div>
    </div>
  );
}

// ─── Empty placeholder ───────────────────────────────────────────────────────

function EmptyDrop({ col }: { col: ColMeta }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-10 px-3 text-center text-[12px] gap-1"
      style={{
        background: "var(--kk-surface)",
        border: "1px dashed var(--kk-line-strong)",
        color: "var(--kk-ink-faint)",
      }}
    >
      <span>Drop here</span>
      <span className="text-[10px] uppercase tracking-wider">to mark {col.shortLabel.toLowerCase()}</span>
    </div>
  );
}

// ─── Draggable card ──────────────────────────────────────────────────────────

function DraggableCard({ t, col, today, baseUrl, isDragging, onOpen }: {
  t: Tenancy;
  col: ColMeta;
  today: Date;
  baseUrl: string;
  isDragging: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: t.id });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(2deg)`, opacity: 0.85, zIndex: 100 }
    : { opacity: isDragging ? 0.4 : 1 };

  // Time signal per stage
  const timeSignal = (() => {
    if (col.stage === "owing") {
      const days = today.getDate() - t.due_day;
      return { text: `${days}d overdue`, color: "var(--kk-red)" };
    }
    if (col.stage === "nearing") {
      const days = t.due_day - today.getDate();
      return { text: days === 0 ? "Due today" : `T-${days} days`, color: "var(--kk-amber)" };
    }
    if (col.stage === "completed" && t.forwarded_at) {
      return { text: `Forwarded ${formatRelative(new Date(t.forwarded_at), today)}`, color: "var(--kk-green)" };
    }
    return null;
  })();

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="kk-card p-4 flex flex-col gap-3 group cursor-grab active:cursor-grabbing hover:border-[color:var(--kk-line-strong)] transition-colors touch-none select-none"
      onClick={(e) => {
        // Action buttons inside the card stop propagation themselves.
        if ((e.target as HTMLElement).closest("[data-card-action]")) return;
        onOpen();
      }}
    >
      <div>
        <p className="kk-card-title" style={{ color: "var(--kk-ink)" }}>
          {t.tenant_name}
        </p>
        <p className="kk-card-sub mt-1 truncate" style={{ color: "var(--kk-ink-faint)" }}>
          {t.property_name}{t.property?.unit ? ` · Unit ${t.property.unit}` : ""}
        </p>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="kk-metric-sm" style={{ color: "var(--kk-ink)" }}>
          RM {t.amount.toLocaleString()}
        </span>
        <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          Due {t.due_day}{ord(t.due_day)}
        </span>
      </div>

      {timeSignal && (
        <span
          className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: col.soft, color: timeSignal.color, border: `1px solid ${col.borderColor}` }}
        >
          {timeSignal.text}
        </span>
      )}

      <CardAction t={t} stage={col.stage} baseUrl={baseUrl} />
    </div>
  );
}

// ─── Per-stage primary action ────────────────────────────────────────────────

function CardAction({ t, stage, baseUrl }: { t: Tenancy; stage: ActionStage; baseUrl: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const uploadUrl = `${baseUrl}/upload/${t.id}`;
  const pingUrl = buildWhatsAppPingUrl(t.tenant_phone, t.tenant_name, t.property_name ?? t.property_id, t.amount, uploadUrl);

  if (stage === "owing" || stage === "nearing") {
    const label = stage === "owing"
      ? (t.status === "Reminder Sent" ? "Re-ping reminder" : "Send reminder")
      : "Send early ping";
    return (
      <button
        type="button"
        data-card-action
        onClick={(e) => {
          e.stopPropagation();
          window.open(pingUrl, "_blank", "noopener,noreferrer");
          startTransition(async () => {
            await markReminderSent(t.id);
            router.refresh();
            toast.success(`Reminder sent to ${t.tenant_name}`);
          });
        }}
        disabled={pending}
        className="kk-pill kk-pill-ghost justify-between w-full"
        style={{ padding: "0.5rem 0.875rem" }}
      >
        <span className="flex items-center gap-1.5">
          <WhatsAppIcon className="w-3.5 h-3.5" />
          {label}
        </span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    );
  }

  if (stage === "pending_verify") {
    return (
      <button
        type="button"
        data-card-action
        onClick={(e) => {
          e.stopPropagation();
          startTransition(async () => {
            const res = await runAiVerification(t.id);
            if (res.ok && res.result) {
              router.refresh();
              toast[res.result.success && res.result.confidence >= 70 ? "success" : "warning"](
                res.result.success ? "Receipt verified" : "Verification inconclusive"
              );
            } else {
              toast.error(res.message);
            }
          });
        }}
        disabled={pending}
        className="kk-pill kk-pill-soft-purple justify-between w-full"
        style={{ padding: "0.5rem 0.875rem" }}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI verify receipt
        </span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    );
  }

  if (stage === "awaiting_forward") {
    if (t.current_month_receipt_url && t.property?.owner_phone) {
      const forwardUrl = buildWhatsAppForwardUrl(
        t.property.owner_phone, t.tenant_name, t.property_name ?? t.property_id, t.amount, t.current_month_receipt_url
      );
      return (
        <button
          type="button"
          data-card-action
          onClick={(e) => {
            e.stopPropagation();
            window.open(forwardUrl, "_blank", "noopener,noreferrer");
            startTransition(async () => {
              await markForwardedToOwner(t.id);
              router.refresh();
              toast.success(`Forwarded to owner. ${t.property_name}`);
            });
          }}
          disabled={pending}
          className="kk-pill kk-pill-soft-green justify-between w-full"
          style={{ padding: "0.5rem 0.875rem" }}
        >
          <span className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Forward to owner
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      );
    }
    return (
      <span
        className="text-[12px] flex items-center gap-1.5 italic"
        style={{ color: "var(--kk-ink-faint)" }}
      >
        Receipt or owner phone missing
      </span>
    );
  }

  // Completed
  return (
    <span
      className="text-[12px] font-medium flex items-center gap-1.5"
      style={{ color: "var(--kk-green)" }}
    >
      <Check className="w-3.5 h-3.5" />
      Done. Owner notified.
    </span>
  );
}

function ord(n: number) {
  if (n >= 11 && n <= 13) return "th";
  return ["th","st","nd","rd"][n % 10] ?? "th";
}

function formatRelative(then: Date, now: Date): string {
  const ms = now.getTime() - then.getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
