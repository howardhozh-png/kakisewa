"use client";

import { useState, useTransition, useCallback, useRef, useMemo } from "react";
import {
  DndContext, DragEndEvent, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { Heart, GripVertical, Check, Loader2, Home, Bed, Bath, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveTenantPropertyRanking } from "@/lib/actions";
import type { PropertyPackShareLead } from "@/lib/db";

interface Props {
  packToken: string;
  initialLeads: PropertyPackShareLead[];
}

export function PropertyPackShareViewer({ packToken, initialLeads }: Props) {
  const sorted = [...initialLeads].sort((a, b) => {
    if (a.tenant_rank == null && b.tenant_rank == null) return a.position - b.position;
    if (a.tenant_rank == null) return 1;
    if (b.tenant_rank == null) return -1;
    return a.tenant_rank - b.tenant_rank;
  });

  const [order, setOrder] = useState<PropertyPackShareLead[]>(sorted);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number>(500);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const fromIdx = order.findIndex((l) => l.owner_lead_id === e.active.id);
    const toIdx   = order.findIndex((l) => l.owner_lead_id === e.over!.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrder(next);
    setDirty(true);
  }, [order]);

  function toggleLike(id: string) {
    setOrder((prev) => prev.map((l) => l.owner_lead_id === id ? { ...l, tenant_liked: l.tenant_liked === 1 ? 0 : 1 } : l));
    setDirty(true);
  }

  function save() {
    const rankings = order.map((l, i) => ({
      owner_lead_id: l.owner_lead_id,
      rank: i + 1,
      liked: l.tenant_liked,
    }));
    startTransition(async () => {
      const res = await saveTenantPropertyRanking(packToken, rankings);
      if (res.ok) {
        setDirty(false);
        setSavedAt(new Date());
        toast.success("Your shortlist has been sent to your agent");
      } else {
        toast.error("Could not save — please try again");
      }
    });
  }

  const draggingLead = draggingId ? order.find((l) => l.owner_lead_id === draggingId) ?? null : null;

  return (
    <div className="space-y-3">
      <DndContext
        id="kakisewa-property-pack-rank"
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
          {order.map((l, i) => (
            <PropertyCard
              key={l.owner_lead_id}
              lead={l}
              rankNumber={i + 1}
              isDragging={draggingId === l.owner_lead_id}
              onLike={() => toggleLike(l.owner_lead_id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 100, easing: "ease" }}>
          {draggingLead
            ? <CardOverlay lead={draggingLead} rankNumber={order.findIndex((l) => l.owner_lead_id === draggingId) + 1} width={dragWidth} />
            : null}
        </DragOverlay>
      </DndContext>

      <div
        className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl"
        style={{ background: "#1C1C1E", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.20)" }}
      >
        <p className="text-[13px] flex-1 leading-snug">
          {savedAt && !dirty
            ? "Submitted — your agent has been notified."
            : "Drag to rank, then submit your shortlist"}
        </p>
        <button
          onClick={save}
          disabled={pending}
          className="shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold"
          style={{ background: "#fff", color: "#1C1C1E" }}
        >
          {pending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
            : savedAt && !dirty
            ? <><Check className="w-3.5 h-3.5 inline mr-1" />Submitted</>
            : "Submit my shortlist"}
        </button>
      </div>
    </div>
  );
}

function PhotoStrip({ photos, coverIndex, rankNumber }: {
  photos: string[];
  coverIndex: number;
  rankNumber: number;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const ordered = useMemo(() => {
    if (photos.length === 0) return [];
    const ci = coverIndex >= 0 && coverIndex < photos.length ? coverIndex : 0;
    return [photos[ci], ...photos.slice(0, ci), ...photos.slice(ci + 1)];
  }, [photos, coverIndex]);

  function onScroll() {
    if (!stripRef.current) return;
    const idx = Math.round(stripRef.current.scrollLeft / stripRef.current.clientWidth);
    setCurrent(idx);
  }

  function goTo(idx: number) {
    if (!stripRef.current) return;
    const clamped = Math.max(0, Math.min(ordered.length - 1, idx));
    stripRef.current.scrollTo({ left: clamped * stripRef.current.clientWidth, behavior: "smooth" });
    setCurrent(clamped);
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: "52%", background: "#F2F2F7" }}>
      {ordered.length > 0 ? (
        <>
          <style>{`.pp-strip::-webkit-scrollbar{display:none}`}</style>
          <div
            ref={stripRef}
            onScroll={onScroll}
            className="pp-strip absolute inset-0 flex overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
          >
            {ordered.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                style={{
                  flexShrink: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  scrollSnapAlign: "start",
                }}
              />
            ))}
          </div>

          {ordered.length > 1 && (
            <>
              {/* Prev button */}
              <button
                onClick={() => goTo(current - 1)}
                aria-label="Previous photo"
                style={{
                  position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                  zIndex: 3, width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: current === 0 ? 0.25 : 1,
                  border: "none", cursor: current === 0 ? "default" : "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              {/* Next button */}
              <button
                onClick={() => goTo(current + 1)}
                aria-label="Next photo"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  zIndex: 3, width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: current === ordered.length - 1 ? 0.25 : 1,
                  border: "none", cursor: current === ordered.length - 1 ? "default" : "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
              {/* Counter */}
              <div
                style={{
                  position: "absolute", bottom: 8, right: 8, zIndex: 3,
                  padding: "2px 8px", borderRadius: 999,
                  background: "rgba(0,0,0,0.45)", color: "#fff",
                  fontSize: 11, fontWeight: 600,
                  backdropFilter: "blur(4px)",
                }}
              >
                {current + 1}/{ordered.length}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Home style={{ width: 32, height: 32, color: "#C7C7CC" }} />
        </div>
      )}
      {/* Rank badge */}
      <div
        className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
        style={{ background: "#1C1C1E", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.30)", zIndex: 2 }}
      >
        {rankNumber}
      </div>
    </div>
  );
}

function PropertyCard({ lead, rankNumber, isDragging, onLike }: {
  lead: PropertyPackShareLead;
  rankNumber: number;
  isDragging: boolean;
  onLike: () => void;
}) {
  const drag = useDraggable({ id: lead.owner_lead_id });
  const drop = useDroppable({ id: lead.owner_lead_id });

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
      <PhotoStrip
        photos={lead.photo_urls}
        coverIndex={lead.cover_photo_index ?? 0}
        rankNumber={rankNumber}
      />

      {/* Details */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-tight" style={{ color: "#1C1C1E" }}>
              {lead.property_name ?? "Property"}
            </p>
          </div>
          {/* Like button */}
          <button
            onClick={onLike}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: lead.tenant_liked === 1 ? "rgba(239,68,68,0.10)" : "#F2F2F7",
              color: lead.tenant_liked === 1 ? "#DC2626" : "#8E8E93",
            }}
            aria-label="Shortlist"
          >
            <Heart style={{ width: 18, height: 18, fill: lead.tenant_liked === 1 ? "currentColor" : "none" }} />
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
            <GripVertical style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {lead.bedrooms != null && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px]"
              style={{ background: "#F2F2F7", color: "#6C6C70" }}>
              <Bed style={{ width: 12, height: 12 }} /> {lead.bedrooms} bed
            </span>
          )}
          {lead.bathrooms != null && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px]"
              style={{ background: "#F2F2F7", color: "#6C6C70" }}>
              <Bath style={{ width: 12, height: 12 }} /> {lead.bathrooms} bath
            </span>
          )}
          {lead.expected_rent != null && (
            <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold ml-auto"
              style={{ background: "#F2F2F7", color: "#1C1C1E" }}>
              RM {lead.expected_rent.toLocaleString()}/mo
            </span>
          )}
        </div>

        {lead.tenant_liked === 1 && (
          <div className="mt-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-center"
            style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
            Shortlisted for viewing
          </div>
        )}
      </div>
    </div>
  );
}

function CardOverlay({ lead, rankNumber, width }: { lead: PropertyPackShareLead; rankNumber: number; width: number }) {
  const coverUrl = lead.photo_urls[lead.cover_photo_index ?? 0] ?? lead.photo_urls[0] ?? null;
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
      <div className="relative w-full" style={{ paddingBottom: "38%", background: "#F2F2F7" }}>
        {coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
          : <div className="absolute inset-0 flex items-center justify-center"><Home style={{ width: 24, height: 24, color: "#C7C7CC" }} /></div>
        }
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
          style={{ background: "#1C1C1E", color: "#fff" }}>
          {rankNumber}
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[15px] font-semibold" style={{ color: "#1C1C1E" }}>{lead.property_name ?? "Property"}</p>
      </div>
    </div>
  );
}
