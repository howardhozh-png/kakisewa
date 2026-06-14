"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { deleteCalendarEvent } from "@/lib/actions";
import { CalendarPlus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/db";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start.getTime() + 6 * 86400000);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString("en-MY", { ...opts, year: "numeric" })} – ${end.toLocaleDateString("en-MY", { ...opts, year: "numeric" })}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${start.toLocaleDateString("en-MY", opts)} – ${end.toLocaleDateString("en-MY", { ...opts, year: "numeric" })}`;
  }
  return `${start.getDate()} – ${end.toLocaleDateString("en-MY", { ...opts, year: "numeric" })}`;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,"0")} ${period}`;
}

interface Props {
  events: CalendarEvent[];
  weekStartISO: string; // "YYYY-MM-DD"
}

export function CalendarView({ events, weekStartISO }: Props) {
  const router = useRouter();
  const weekStart = new Date(weekStartISO + "T00:00:00");
  const today = toISO(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | undefined>();
  const [deletingId, startDelete] = useTransition();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000);
    return { date: d, iso: toISO(d), dayName: DAY_NAMES[i], dayNum: d.getDate() };
  });

  function navigate(delta: number) {
    const next = new Date(weekStart.getTime() + delta * 7 * 86400000);
    router.push(`/calendar?week=${toISO(next)}`);
  }

  function goToday() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    router.push(`/calendar?week=${toISO(d)}`);
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      await deleteCalendarEvent(id);
      toast.success("Event removed");
      router.refresh();
    });
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>My Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="kk-pill kk-pill-ghost text-[13px] font-medium"
            style={{ padding: "7px 14px" }}
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "var(--kk-ink-soft)" }} />
          </button>
          <span className="text-[14px] font-600 tabular-nums" style={{ color: "var(--kk-ink)", minWidth: 150, textAlign: "center", fontWeight: 600 }}>
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--kk-ink-soft)" }} />
          </button>
          <button
            onClick={() => { setAddDate(today); setAddOpen(true); }}
            className="kk-pill flex items-center gap-2"
            style={{ background: "var(--kk-blue)", color: "#fff", padding: "7px 14px", fontSize: 13 }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Add event
          </button>
        </div>
      </div>

      {/* Desktop 7-column grid */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          background: "var(--kk-surface)",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--kk-line)",
          boxShadow: "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {days.map(({ date, iso, dayName, dayNum }, idx) => {
          const isToday = iso === today;
          const dayEvents = events.filter((e) => e.event_date === iso);
          return (
            <div
              key={iso}
              style={{
                borderRight: idx < 6 ? "1px solid rgba(0,0,0,0.05)" : "none",
                background: isToday ? "rgba(0,113,227,0.02)" : "transparent",
                minHeight: 360,
                padding: "12px 8px",
              }}
            >
              {/* Day header */}
              <div style={{ textAlign: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-ink-faint)", marginBottom: 5 }}>
                  {dayName}
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: "50%",
                  background: isToday ? "var(--kk-blue)" : "transparent",
                  color: isToday ? "#fff" : "var(--kk-ink)",
                  fontSize: 17, fontWeight: 700,
                }}>
                  {dayNum}
                </div>
              </div>

              {/* Events */}
              {dayEvents.map((ev) => (
                <EventPill key={ev.id} ev={ev} onDelete={handleDelete} />
              ))}

              {/* Add slot */}
              <button
                onClick={() => { setAddDate(iso); setAddOpen(true); }}
                data-add-slot
                style={{
                  marginTop: 6, width: "100%", padding: "5px 0",
                  textAlign: "center", fontSize: 11,
                  color: "var(--kk-ink-faint)",
                  background: "none", border: "none", cursor: "pointer",
                  borderRadius: 7,
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "var(--kk-surface-2)"; (e.target as HTMLButtonElement).style.color = "var(--kk-blue)"; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "none"; (e.target as HTMLButtonElement).style.color = "var(--kk-ink-faint)"; }}
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile agenda view */}
      <div className="lg:hidden space-y-6">
        {days.map(({ date, iso, dayName, dayNum }) => {
          const isToday = iso === today;
          const dayEvents = events.filter((e) => e.event_date === iso);
          if (!isToday && dayEvents.length === 0) return null;
          return (
            <div key={iso}>
              <div className="flex items-center gap-3 mb-3">
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--kk-blue)" : "var(--kk-surface-2)",
                  color: isToday ? "#fff" : "var(--kk-ink)",
                  fontSize: 16, fontWeight: 700,
                }}>
                  {dayNum}
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                    {dayName}{isToday ? " · Today" : ""}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                    {date.toLocaleDateString("en-MY", { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>
              {dayEvents.length > 0 ? (
                <div className="space-y-2 ml-12">
                  {dayEvents.map((ev) => (
                    <EventPill key={ev.id} ev={ev} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <p className="ml-12 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>No events today</p>
              )}
            </div>
          );
        })}

        {days.every(({ iso }) => events.filter(e => e.event_date === iso).length === 0) && (
          <div className="text-center py-12">
            <p className="text-[14px]" style={{ color: "var(--kk-ink-mute)" }}>No events this week</p>
            <button
              onClick={() => { setAddDate(today); setAddOpen(true); }}
              className="mt-4 kk-pill"
              style={{ background: "var(--kk-blue)", color: "#fff", fontSize: 13 }}
            >
              Add first event
            </button>
          </div>
        )}
      </div>

      {/* Global add dialog */}
      <CalendarEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultDate={addDate}
      />
    </div>
  );
}

function EventPill({ ev, onDelete }: { ev: CalendarEvent; onDelete: (id: string) => void }) {
  const [hover, setHover] = useState(false);

  const timeStr = ev.event_time ? formatTime(ev.event_time) : "All day";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 9,
        padding: "7px 9px",
        marginBottom: 5,
        background: "rgba(0,113,227,0.08)",
        color: "#004FAD",
        cursor: "default",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", opacity: 0.75 }}>{timeStr}</div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{ev.title}</div>
      {hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }}
          style={{
            position: "absolute", top: 5, right: 5,
            background: "none", border: "none", cursor: "pointer",
            color: "#004FAD", opacity: 0.55, padding: 2,
          }}
          title="Remove event"
        >
          <Trash2 style={{ width: 11, height: 11 }} />
        </button>
      )}
    </div>
  );
}
