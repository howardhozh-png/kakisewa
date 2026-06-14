"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Loader2, X } from "lucide-react";
import { createCalendarEvent } from "@/lib/actions";
import { toast } from "sonner";

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

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  defaultDate?: string; // "YYYY-MM-DD"
  contextLabel?: string;
  subtitle?: string;
  cardHref?: string;
  tenancyId?: string;
  ownerLeadId?: string;
}

export function CalendarEventDialog({
  open, onOpenChange,
  defaultTitle = "",
  defaultDate,
  contextLabel,
  subtitle,
  cardHref,
  tenancyId,
  ownerLeadId,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? new Date(defaultDate + "T00:00:00") : new Date()
  );
  const [timeLabel, setTimeLabel] = useState<string>("");
  const [showCal, setShowCal] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpen(val: boolean) {
    if (val) {
      setTitle(defaultTitle);
      setDate(defaultDate ? new Date(defaultDate + "T00:00:00") : new Date());
      setTimeLabel("");
      setShowCal(false);
    }
    onOpenChange(val);
  }

  function handleSave() {
    if (!title.trim()) { toast.error("Please enter an event name"); return; }
    if (!date) { toast.error("Please pick a date"); return; }
    startTransition(async () => {
      const res = await createCalendarEvent({
        title: title.trim(),
        event_date: toISO(date),
        event_time: timeLabel ? to24h(timeLabel) : null,
        subtitle: subtitle || null,
        card_href: cardHref || null,
        tenancy_id: tenancyId,
        owner_lead_id: ownerLeadId,
      });
      if (!res.ok) { toast.error(res.message ?? "Failed to save"); return; }
      toast.success("Event saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-border" style={{ maxWidth: 420, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--kk-line)" }}>
          <p className="kk-overline mb-1">New event</p>
          <p className="text-[17px] font-semibold" style={{ color: "var(--kk-ink)", letterSpacing: "-0.01em" }}>
            Add to calendar
          </p>
          {contextLabel && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{contextLabel}</p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          {/* Title */}
          <p className="kk-overline mb-1.5">Event name</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. House viewing 3pm"
            autoFocus
            style={{
              width: "100%",
              border: "1.5px solid var(--kk-line)",
              borderRadius: 10,
              padding: "10px 13px",
              fontSize: 14,
              color: "var(--kk-ink)",
              background: "var(--kk-surface)",
              outline: "none",
              fontFamily: "inherit",
              marginBottom: 16,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--kk-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--kk-line)")}
          />

          {/* Date + Time row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div>
              <p className="kk-overline mb-1.5">Date</p>
              <button
                type="button"
                onClick={() => setShowCal((v) => !v)}
                style={{
                  width: "100%",
                  border: showCal ? "1.5px solid var(--kk-blue)" : "1.5px solid var(--kk-line)",
                  borderRadius: 10,
                  padding: "10px 13px",
                  fontSize: 14,
                  color: date ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                  background: "var(--kk-surface)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <CalendarDays style={{ width: 14, height: 14, flexShrink: 0, color: "var(--kk-ink-faint)" }} />
                {date ? formatDisplay(date) : "Pick date"}
              </button>
            </div>
            <div>
              <p className="kk-overline mb-1.5">Time (optional)</p>
              <div style={{ position: "relative" }}>
                <select
                  value={timeLabel}
                  onChange={(e) => setTimeLabel(e.target.value)}
                  style={{
                    width: "100%",
                    border: "1.5px solid var(--kk-line)",
                    borderRadius: 10,
                    padding: "10px 13px",
                    fontSize: 14,
                    color: timeLabel ? "var(--kk-ink)" : "var(--kk-ink-faint)",
                    background: "var(--kk-surface)",
                    appearance: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                >
                  <option value="">No time</option>
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Inline calendar picker */}
          {showCal && (
            <div style={{
              marginTop: 8,
              border: "1.5px solid var(--kk-blue)",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--kk-surface)",
            }}>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setShowCal(false); }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "14px 22px",
          borderTop: "1px solid var(--kk-line)",
        }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="kk-pill kk-pill-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="kk-pill"
            style={{ background: "var(--kk-blue)", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {pending ? "Saving…" : "Save event"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
