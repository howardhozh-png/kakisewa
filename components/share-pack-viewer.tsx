"use client";

import { useState, useTransition, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { PackTenant } from "@/lib/types";
import { saveOwnerPackRanking } from "@/lib/actions";
import { Heart, GripVertical, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  packId: string;
  initialTenants: PackTenant[];
}

export function SharePackViewer({ packId, initialTenants }: Props) {
  const sorted = [...initialTenants].sort((a, b) => {
    if (a.rank == null && b.rank == null) return a.position - b.position;
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  const [order, setOrder] = useState<PackTenant[]>(sorted);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number>(600);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const t of sorted) if (t.owner_note) m[t.id] = t.owner_note;
    return m;
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const fromIdx = order.findIndex((t) => t.id === e.active.id);
    const toIdx   = order.findIndex((t) => t.id === e.over!.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrder(next);
    setDirty(true);
  }, [order]);

  function toggleLike(id: string) {
    setOrder((prev) => prev.map((t) => (t.id === id ? { ...t, liked: t.liked === 1 ? 0 : 1 } : t)));
    setDirty(true);
  }

  function setNote(id: string, val: string) {
    setNotes((prev) => ({ ...prev, [id]: val }));
    setDirty(true);
  }

  function save() {
    const rankings = order.map((t, i) => ({
      tenant_id: t.id,
      rank: i + 1,
      liked: t.liked,
      owner_note: notes[t.id] ?? null,
    }));
    startTransition(async () => {
      const res = await saveOwnerPackRanking(packId, rankings);
      if (res.ok) {
        setDirty(false);
        setSavedAt(new Date());
        toast.success("Your ranking has been sent to your agent");
      } else {
        toast.error("Could not save");
      }
    });
  }

  const draggingTenant = draggingId ? order.find((t) => t.id === draggingId) ?? null : null;

  return (
    <div className="space-y-4">
      <DndContext
        id="kakisewa-pack-rank"
        sensors={sensors}
        onDragStart={(e) => {
          setDraggingId(String(e.active.id));
          const w = (e.active.rect?.current?.initial as { width?: number } | null)?.width;
          if (w) setDragWidth(w);
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div className="space-y-3">
          {order.map((t, i) => (
            <RankedCard
              key={t.id}
              t={t}
              rankNumber={i + 1}
              isDragging={draggingId === t.id}
              note={notes[t.id] ?? ""}
              onLike={() => toggleLike(t.id)}
              onNote={(v) => setNote(t.id, v)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 100, easing: "ease" }}>
          {draggingTenant ? <CardOverlay t={draggingTenant} rankNumber={order.findIndex((t) => t.id === draggingId) + 1} width={dragWidth} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 mt-8 flex items-center justify-between gap-3 px-5 py-4 rounded-2xl"
        style={{ background: "var(--kk-ink)", color: "#fff", boxShadow: "0 12px 32px rgba(0,0,0,0.16)" }}>
        <p className="text-[13px] flex-1">
          {dirty ? "Your ranking has unsaved changes" :
            savedAt ? "Saved. Your agent has been notified." :
            "Drag the cards to set your preferred order"}
        </p>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="px-4 py-2 rounded-full text-[13px] font-medium"
          style={{
            background: dirty ? "#fff" : "rgba(255,255,255,0.18)",
            color: dirty ? "var(--kk-ink)" : "rgba(255,255,255,0.6)",
          }}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
          {pending ? "Saving…" : savedAt && !dirty ? <><Check className="w-3.5 h-3.5 inline mr-1" /> Saved</> : "Save my ranking"}
        </button>
      </div>
    </div>
  );
}

function RankedCard({ t, rankNumber, isDragging, note, onLike, onNote }: {
  t: PackTenant; rankNumber: number; isDragging: boolean;
  note: string; onLike: () => void; onNote: (v: string) => void;
}) {
  const drag = useDraggable({ id: t.id });
  const drop = useDroppable({ id: t.id });

  return (
    <div
      ref={drop.setNodeRef}
      className="relative rounded-3xl p-6 flex items-start gap-4"
      style={{
        background: "var(--kk-surface)",
        border: drop.isOver ? "2px solid var(--kk-blue)" : "1px solid var(--kk-line)",
        opacity: isDragging ? 0.2 : 1,
        willChange: isDragging ? "opacity" : undefined,
      }}
    >
      {/* Rank pill */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-semibold tabular-nums"
        style={{ background: "var(--kk-ink)", color: "#fff" }}
      >
        {rankNumber}
      </div>

      {/* Tenant info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="serif text-[20px] leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
              {t.name}
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
              {t.age ? `${t.age} years old` : ""}
              {t.occupation ? ` · ${t.occupation}` : ""}
              {t.nationality ? ` · ${t.nationality}` : ""}
            </p>
          </div>
          <button
            onClick={onLike}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110"
            style={{
              background: t.liked === 1 ? "var(--kk-red-soft)" : "var(--kk-surface-2)",
              color: t.liked === 1 ? "var(--kk-red)" : "var(--kk-ink-mute)",
              transition: "background 0.15s, color 0.15s, transform 0.1s",
            }}
            aria-label="Want to view"
          >
            <Heart className="w-5 h-5" style={{ fill: t.liked === 1 ? "currentColor" : "none" }} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3 text-[12px]">
          {t.budget_max != null && (
            <Pill bg="var(--kk-green-soft)" ink="#1F8B4C">Budget up to RM {t.budget_max.toLocaleString()}/mo</Pill>
          )}
          {t.nationality && <Pill>{t.nationality}</Pill>}
          {t.monthly_income != null && (
            <Pill>Income RM {t.monthly_income.toLocaleString()}/mo</Pill>
          )}
          {t.bedrooms_pref != null && <Pill>{t.bedrooms_pref} bed</Pill>}
          {t.preferred_move_in && (
            <Pill bg="var(--kk-blue-soft)" ink="var(--kk-blue)">Move in {formatDate(t.preferred_move_in)}</Pill>
          )}
          {t.occupants != null && <Pill>{t.occupants} occupant{t.occupants === 1 ? "" : "s"}</Pill>}
          {t.pets === 1 && <Pill>🐾 has pets</Pill>}
          {t.smoking === 1 && <Pill>🚬 smokes</Pill>}
        </div>

        {t.notes && (
          <p className="text-[13px] mt-3 leading-relaxed break-words" style={{ color: "var(--kk-ink-soft)" }}>
            {t.notes}
          </p>
        )}

        {/* Owner private note */}
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Add a private note for your agent…"
          rows={1}
          className="w-full mt-3 text-[13px] px-3 py-2 rounded-xl resize-none"
          style={{
            background: "var(--kk-surface-2)",
            border: "1px solid var(--kk-line)",
            color: "var(--kk-ink)",
            minHeight: 40,
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
        />
      </div>

      {/* Drag handle */}
      <button
        ref={drag.setNodeRef}
        {...drag.attributes}
        {...drag.listeners}
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
    </div>
  );
}

// Floating overlay shown while dragging — lightweight, no interactive elements
function CardOverlay({ t, rankNumber, width }: { t: PackTenant; rankNumber: number; width: number }) {
  return (
    <div
      className="rounded-3xl p-6 flex items-start gap-4"
      style={{
        background: "var(--kk-surface)",
        border: "2px solid var(--kk-blue)",
        boxShadow: "0 20px 48px rgba(0,0,0,0.24)",
        transform: "rotate(1.5deg) scale(1.02)",
        cursor: "grabbing",
        opacity: 0.96,
        width,
      }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-semibold"
        style={{ background: "var(--kk-ink)", color: "#fff" }}>
        {rankNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="serif text-[20px] leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>{t.name}</p>
        <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
          {t.occupation ?? ""}
          {t.nationality ? ` · ${t.nationality}` : ""}
        </p>
      </div>
      <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
        <GripVertical className="w-4 h-4" />
      </div>
    </div>
  );
}

function Pill({ bg, ink, children }: { bg?: string; ink?: string; children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full"
      style={{ background: bg ?? "var(--kk-surface-2)", color: ink ?? "var(--kk-ink-mute)" }}>
      {children}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${d}, ${y}`;
  } catch { return iso; }
}
