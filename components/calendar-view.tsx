"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/actions";
import { CalendarPlus, Trash2, ChevronLeft, ChevronRight, ExternalLink, CalendarDays, Clock, Loader2 } from "lucide-react";
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
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
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
                <EventPill key={ev.id} ev={ev} onDelete={handleDelete} onClick={() => setDetailEvent(ev)} />
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
                    <EventPill key={ev.id} ev={ev} onDelete={handleDelete} onClick={() => setDetailEvent(ev)} />
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

      {/* Event detail popup */}
      <EventDetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onDelete={(id) => { setDetailEvent(null); handleDelete(id); }}
      />
    </div>
  );
}

function EventPill({ ev, onDelete, onClick }: { ev: CalendarEvent; onDelete: (id: string) => void; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const timeStr = ev.event_time ? formatTime(ev.event_time) : "All day";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 9,
        padding: "7px 9px",
        marginBottom: 5,
        background: "rgba(0,113,227,0.08)",
        color: "#004FAD",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", opacity: 0.75 }}>{timeStr}</div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{ev.title}</div>
      {ev.subtitle && (
        <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.3, marginTop: 1 }}>{ev.subtitle}</div>
      )}
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

const TIMES = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM",
];

function to24h(label: string): string {
  const [time, period] = label.split(" ");
  const [h, m] = time.split(":").map(Number);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function to12h(t24: string): string {
  const [h, m] = t24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function EventDetailDialog({
  event, onClose, onDelete,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [timeLabel, setTimeLabel] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [pending, startTransition] = useTransition();

  // Sync fields when a different event is opened
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(new Date(event.event_date + "T00:00:00"));
      setTimeLabel(event.event_time ? to12h(event.event_time) : "");
      setShowCal(false);
      setConfirmDelete(false);
    }
  }, [event?.id]);

  if (!event) return null;

  function handleSave() {
    if (!title.trim()) { toast.error("Please enter an event name"); return; }
    if (!date) { toast.error("Please pick a date"); return; }
    startTransition(async () => {
      const res = await updateCalendarEvent(event!.id, {
        title: title.trim(),
        event_date: toISO(date!),
        event_time: timeLabel ? to24h(timeLabel) : null,
      });
      if (!res.ok) { toast.error(res.message ?? "Failed to update"); return; }
      toast.success("Event updated");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={!!event} onOpenChange={(o) => { if (!o) { onClose(); setConfirmDelete(false); setShowCal(false); } }}>
      <DialogContent className="bg-card border-border" style={{ maxWidth: 420, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--kk-line)" }}>
          <p className="kk-overline mb-1">Edit event</p>
          {event.subtitle && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{event.subtitle}</p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          <p className="kk-overline mb-1.5">Event name</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. House viewing 3pm"
            style={{
              width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10,
              padding: "10px 13px", fontSize: 14, color: "var(--kk-ink)",
              background: "var(--kk-surface)", outline: "none", fontFamily: "inherit", marginBottom: 16,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--kk-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--kk-line)")}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div>
              <p className="kk-overline mb-1.5">Date</p>
              <button
                type="button"
                onClick={() => setShowCal((v) => !v)}
                style={{
                  width: "100%", border: showCal ? "1.5px solid var(--kk-blue)" : "1.5px solid var(--kk-line)",
                  borderRadius: 10, padding: "10px 13px", fontSize: 14,
                  color: date ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                  background: "var(--kk-surface)", textAlign: "left", cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <CalendarDays style={{ width: 14, height: 14, flexShrink: 0, color: "var(--kk-ink-faint)" }} />
                {date ? formatDisplay(date) : "Pick date"}
              </button>
            </div>
            <div>
              <p className="kk-overline mb-1.5">Time (optional)</p>
              <select
                value={timeLabel}
                onChange={(e) => setTimeLabel(e.target.value)}
                style={{
                  width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10,
                  padding: "10px 13px", fontSize: 14,
                  color: timeLabel ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                  background: "var(--kk-surface)", appearance: "none", cursor: "pointer",
                  fontFamily: "inherit", outline: "none",
                }}
              >
                <option value="">No time</option>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {showCal && (
            <div style={{ marginTop: 8, border: "1.5px solid var(--kk-blue)", borderRadius: 12, overflow: "hidden", background: "var(--kk-surface)" }}>
              <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setShowCal(false); }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px 18px", borderTop: "1px solid var(--kk-line)", display: "flex", alignItems: "center", gap: 8 }}>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-red-50"
              style={{ color: "var(--kk-ink-faint)" }}>
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          ) : (
            <button type="button" onClick={() => onDelete(event.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "var(--kk-red)", color: "#fff" }}>
              Confirm delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          {event.card_href && (
            <button type="button" onClick={() => { onClose(); router.push(event.card_href!); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
              <ExternalLink className="w-3 h-3" />
              Go to card
            </button>
          )}
          <button type="button" onClick={onClose} className="kk-pill kk-pill-ghost" style={{ fontSize: 12 }} disabled={pending}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={pending}
            className="kk-pill flex items-center gap-1.5"
            style={{ background: "var(--kk-blue)", color: "#fff", fontSize: 12, padding: "7px 14px" }}>
            {pending && <Loader2 className="w-3 h-3 animate-spin" />}
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
