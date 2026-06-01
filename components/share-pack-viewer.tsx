"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { PackTenant } from "@/lib/types";
import { saveOwnerPackRanking } from "@/lib/actions";
import { Heart, GripVertical, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  packId: string;
  initialTenants: PackTenant[];
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0]?.[0] ? `${parts[0][0]}.` : name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function fmtDate(iso: string): string {
  try {
    const [y, m] = iso.split("-").map(Number);
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]} ${y}`;
  } catch { return iso; }
}

function lifestyleText(pets: number | null, smoking: number | null): string {
  const p = pets === 1 ? "Has pets" : "No pets";
  const s = smoking === 1 ? "Smoker" : "Non-smoker";
  return `${p} · ${s}`;
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
  const [dragWidth, setDragWidth] = useState<number>(500);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const t of sorted) if (t.owner_note) m[t.id] = t.owner_note;
    return m;
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // TouchSensor for mobile drag — requires a 250ms press-and-hold activation
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

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
    <div className="space-y-3">
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
          {draggingTenant
            ? <CardOverlay t={draggingTenant} rankNumber={order.findIndex((t) => t.id === draggingId) + 1} width={dragWidth} />
            : null}
        </DragOverlay>
      </DndContext>

      {/* Sticky save bar */}
      <div
        className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl"
        style={{ background: "#1C1C1E", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.20)" }}
      >
        <p className="text-[13px] flex-1 leading-snug">
          {dirty
            ? "Tap Save to send your ranking"
            : savedAt
            ? "Saved — your agent has been notified."
            : "Drag cards to set your preferred order"}
        </p>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold"
          style={{
            background: dirty ? "#fff" : "rgba(255,255,255,0.15)",
            color: dirty ? "#1C1C1E" : "rgba(255,255,255,0.5)",
          }}
        >
          {pending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
            : savedAt && !dirty
            ? <><Check className="w-3.5 h-3.5 inline mr-1" />Saved</>
            : "Save my ranking"}
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: drop.isOver ? "2px solid #007AFF" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        opacity: isDragging ? 0.15 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
          style={{ background: "#1C1C1E", color: "#fff" }}
        >
          {rankNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "#1C1C1E" }}>
            {maskName(t.name)}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "#6C6C70" }}>
            {[t.age ? `${t.age} yrs` : null, t.nationality].filter(Boolean).join(" · ")}
          </p>
        </div>
        {/* Like button */}
        <button
          onClick={onLike}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: t.liked === 1 ? "rgba(239,68,68,0.10)" : "#F2F2F7",
            color: t.liked === 1 ? "#DC2626" : "#8E8E93",
          }}
          aria-label="Shortlist"
        >
          <Heart className="w-4.5 h-4.5" style={{ fill: t.liked === 1 ? "currentColor" : "none", width: 18, height: 18 }} />
        </button>
        {/* Drag handle */}
        <button
          ref={drag.setNodeRef}
          {...drag.attributes}
          {...drag.listeners}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
          style={{ background: "#F2F2F7", color: "#8E8E93" }}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Structured info grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {t.occupation && (
          <InfoCell label="Occupation" value={t.occupation} />
        )}
        {t.preferred_move_in && (
          <InfoCell label="Move-in" value={fmtDate(t.preferred_move_in)} highlight />
        )}
        {t.occupants != null && (
          <InfoCell label="Occupants" value={`${t.occupants} pax`} />
        )}
        <InfoCell
          label="Lifestyle"
          value={lifestyleText(t.pets ?? null, t.smoking ?? null)}
        />
        {t.notes && (
          <div className="col-span-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#AEAEB2" }}>
              Agent note
            </p>
            <p className="text-[13px] leading-snug" style={{ color: "#6C6C70" }}>
              {t.notes}
            </p>
          </div>
        )}
      </div>

      {t.liked === 1 && (
        <div className="mx-4 mb-3 px-3 py-1.5 rounded-lg text-[12px] font-medium text-center"
          style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
          ❤ Shortlisted for viewing
        </div>
      )}

      {/* Owner private note */}
      <div className="px-4 pb-4">
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Add a private note for your agent…"
          rows={1}
          className="w-full text-[13px] px-3 py-2 rounded-xl resize-none outline-none"
          style={{
            background: "#F2F2F7",
            border: "none",
            color: "#1C1C1E",
            minHeight: 38,
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
        />
      </div>
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#AEAEB2" }}>
        {label}
      </p>
      <p className="text-[13px]" style={{ color: highlight ? "#007AFF" : "#1C1C1E" }}>
        {value}
      </p>
    </div>
  );
}

function CardOverlay({ t, rankNumber, width }: { t: PackTenant; rankNumber: number; width: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "2px solid #007AFF",
        boxShadow: "0 20px 48px rgba(0,0,0,0.20)",
        transform: "rotate(1.5deg) scale(1.02)",
        cursor: "grabbing",
        width,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
          style={{ background: "#1C1C1E", color: "#fff" }}>
          {rankNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold" style={{ color: "#1C1C1E" }}>{maskName(t.name)}</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#6C6C70" }}>
            {[t.age ? `${t.age} yrs` : null, t.nationality].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}
