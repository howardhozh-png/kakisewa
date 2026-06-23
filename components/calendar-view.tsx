"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from "date-fns";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/actions";
import { CalendarPlus, Trash2, ExternalLink, CalendarDays, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/db";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const TIMES = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM",
];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

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

interface Props {
  events: CalendarEvent[];
  monthISO: string; // "YYYY-MM"
}

export function CalendarView({ events, monthISO }: Props) {
  const router = useRouter();
  const [yearStr, monthStr] = monthISO.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr); // 1-indexed
  const currentMonth = new Date(year, monthNum - 1, 1);

  // Today pinned to MYT
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

  const [popoverDay, setPopoverDay] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | undefined>();
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [, startDelete] = useTransition();

  // Build the month grid (Mon–Sun, always starting on the Monday of the first week)
  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridDays: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    gridDays.push(d);
    d = addDays(d, 1);
  }

  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  function navigate(y: number, m: number) {
    router.push(`/calendar?month=${y}-${String(m).padStart(2, "0")}`);
  }

  function goToday() {
    const [ty, tm] = today.split("-").map(Number);
    navigate(ty, tm);
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      await deleteCalendarEvent(id);
      toast.success("Event removed");
      setPopoverDay(null);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>My Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <Select
            value={String(monthNum - 1)}
            onValueChange={(v) => v && navigate(year, parseInt(v) + 1)}
          >
            <SelectTrigger style={{ width: 130, fontSize: 13, height: 34 }}>
              <SelectValue>{MONTHS[monthNum - 1]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year selector */}
          <Select
            value={String(year)}
            onValueChange={(v) => v && navigate(parseInt(v), monthNum)}
          >
            <SelectTrigger style={{ width: 88, fontSize: 13, height: 34 }}>
              <SelectValue>{year}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={goToday}
            className="kk-pill kk-pill-ghost text-[13px] font-medium"
            style={{ padding: "7px 14px" }}
          >
            Today
          </button>

          <button
            id="tour-add-event"
            onClick={() => { setAddDate(today); setAddOpen(true); }}
            className="kk-pill flex items-center gap-2"
            style={{ background: "var(--kk-blue)", color: "#fff", padding: "7px 14px", fontSize: 13 }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Add event
          </button>
        </div>
      </div>

      {/* Calendar card */}
      <div
        style={{
          background: "var(--kk-surface)",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--kk-line)",
          boxShadow: "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Day-of-week header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--kk-line)" }}>
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              style={{
                textAlign: "center",
                padding: "10px 0 9px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--kk-ink-faint)",
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {gridDays.map((day, idx) => {
            const iso = toISO(day);
            const isToday = iso === today;
            const inMonth = isSameMonth(day, currentMonth);
            const dayEvents = events.filter((e) => e.event_date === iso);
            const isWeekEnd = idx % 7 === 6;
            const isLastRow = idx >= gridDays.length - 7;

            return (
              <Popover
                key={iso}
                open={popoverDay === iso}
                onOpenChange={(o) => { if (!o) setPopoverDay(null); }}
              >
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setPopoverDay(popoverDay === iso ? null : iso)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "10px 4px 10px",
                      minHeight: 76,
                      borderRight: !isWeekEnd ? "1px solid var(--kk-line)" : "none",
                      borderBottom: !isLastRow ? "1px solid var(--kk-line)" : "none",
                      background: isToday ? "rgba(0,113,227,0.03)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.12s",
                      outline: "none",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      if (!isToday) (e.currentTarget as HTMLButtonElement).style.background = "var(--kk-surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = isToday
                        ? "rgba(0,113,227,0.03)"
                        : "transparent";
                    }}
                  >
                    {/* Day number */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isToday ? "var(--kk-blue)" : "transparent",
                        color: isToday ? "#fff" : inMonth ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                        fontSize: 13,
                        fontWeight: isToday ? 700 : inMonth ? 600 : 400,
                        flexShrink: 0,
                        marginBottom: 4,
                      }}
                    >
                      {day.getDate()}
                    </div>

                    {/* Event dots */}
                    {dayEvents.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          flexWrap: "wrap",
                          justifyContent: "center",
                          maxWidth: "100%",
                          paddingLeft: 2,
                          paddingRight: 2,
                        }}
                      >
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--kk-theme-dark)",
                              flexShrink: 0,
                            }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 700,
                              color: "var(--kk-ink-mute)",
                              lineHeight: "5px",
                            }}
                          >
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-72 p-0"
                  align="center"
                  sideOffset={4}
                >
                  {/* Popover header */}
                  <div
                    style={{
                      padding: "11px 14px 9px",
                      borderBottom: "1px solid var(--kk-line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)" }}>
                      {day.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
                      {isToday && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--kk-blue)",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          Today
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => { setPopoverDay(null); setAddDate(iso); setAddOpen(true); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "var(--kk-blue)",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <CalendarPlus style={{ width: 11, height: 11 }} />
                      Add
                    </button>
                  </div>

                  {/* Events list */}
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    {dayEvents.length === 0 ? (
                      <p
                        style={{
                          padding: "12px 14px",
                          fontSize: 12,
                          color: "var(--kk-ink-faint)",
                        }}
                      >
                        No events scheduled
                      </p>
                    ) : (
                      dayEvents.map((ev, i) => (
                        <div
                          key={ev.id}
                          style={{
                            padding: "8px 14px",
                            borderBottom: i < dayEvents.length - 1 ? "1px solid var(--kk-line)" : "none",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {ev.event_time && (
                              <p
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "var(--kk-ink-mute)",
                                  marginBottom: 1,
                                }}
                              >
                                {formatTime(ev.event_time)}
                              </p>
                            )}
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--kk-ink)",
                                lineHeight: 1.3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ev.title}
                            </p>
                            {ev.subtitle && (
                              <p
                                style={{
                                  fontSize: 10,
                                  color: "var(--kk-ink-mute)",
                                  marginTop: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ev.subtitle}
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                            <button
                              onClick={() => { setPopoverDay(null); setDetailEvent(ev); }}
                              style={{
                                padding: 5,
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "var(--kk-ink-faint)",
                                borderRadius: 6,
                              }}
                              title="Edit"
                            >
                              <Pencil style={{ width: 11, height: 11 }} />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              style={{
                                padding: 5,
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "var(--kk-red)",
                                borderRadius: 6,
                              }}
                              title="Delete"
                            >
                              <Trash2 style={{ width: 11, height: 11 }} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Global add dialog */}
      <CalendarEventDialog open={addOpen} onOpenChange={setAddOpen} defaultDate={addDate} />

      {/* Event detail/edit dialog */}
      <EventDetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onDelete={(id) => { setDetailEvent(null); handleDelete(id); }}
      />
    </div>
  );
}

// ─── EventDetailDialog (edit/delete a calendar event) ──────────────────────

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
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(new Date(event.event_date + "T00:00:00"));
      setTimeLabel(event.event_time ? to12h(event.event_time) : "");
      setOwnerName(event.owner_name ?? "");
      setOwnerPhone(event.owner_phone ?? "");
      setTenantName(event.tenant_name ?? "");
      setTenantPhone(event.tenant_phone ?? "");
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
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        tenant_name: tenantName.trim() || null,
        tenant_phone: tenantPhone.trim() || null,
      });
      if (!res.ok) { toast.error(res.message ?? "Failed to update"); return; }
      toast.success("Event updated");
      onClose();
      router.refresh();
    });
  }

  function ContactRow({ label, nameVal, phoneVal, onNameChange, onPhoneChange }: {
    label: string; nameVal: string; phoneVal: string;
    onNameChange: (v: string) => void; onPhoneChange: (v: string) => void;
  }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <p className="kk-overline mb-1.5">{label}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            value={nameVal}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name (optional)"
            style={{ width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "var(--kk-ink)", background: "var(--kk-surface)", outline: "none", fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--kk-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--kk-line)")}
          />
          <input
            value={phoneVal}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Phone (optional)"
            type="tel"
            style={{ width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "var(--kk-ink)", background: "var(--kk-surface)", outline: "none", fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--kk-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--kk-line)")}
          />
        </div>
      </div>
    );
  }

  return (
    <Dialog open={!!event} onOpenChange={(o) => { if (!o) { onClose(); setConfirmDelete(false); setShowCal(false); } }}>
      <DialogContent className="bg-card border-border" style={{ maxWidth: 460, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--kk-line)" }}>
          <p className="kk-overline mb-1">Edit event</p>
          {event.subtitle && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{event.subtitle}</p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", maxHeight: "70vh", overflowY: "auto" }}>
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
                  width: "100%", border: "1.5px solid var(--kk-line)",
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
            <div style={{ marginTop: 8, marginBottom: 12, border: "1px solid var(--kk-line)", borderRadius: 12, overflow: "hidden", background: "var(--kk-surface)" }}>
              <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setShowCal(false); }} />
            </div>
          )}

          <div style={{ height: 1, background: "var(--kk-line)", margin: "16px 0 14px" }} />
          <ContactRow label="Owner" nameVal={ownerName} phoneVal={ownerPhone} onNameChange={setOwnerName} onPhoneChange={setOwnerPhone} />
          <ContactRow label="Tenant" nameVal={tenantName} phoneVal={tenantPhone} onNameChange={setTenantName} onPhoneChange={setTenantPhone} />
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
