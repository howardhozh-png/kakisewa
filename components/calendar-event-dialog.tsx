"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
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

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function ContactField({ label, nameVal, phoneVal, onNameChange, onPhoneChange }: {
  label: string;
  nameVal: string;
  phoneVal: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
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
  defaultOwnerName?: string;
  defaultOwnerPhone?: string;
  defaultTenantName?: string;
  defaultTenantPhone?: string;
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
  defaultOwnerName = "",
  defaultOwnerPhone = "",
  defaultTenantName = "",
  defaultTenantPhone = "",
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? new Date(defaultDate + "T00:00:00") : new Date()
  );
  const [timeLabel, setTimeLabel] = useState<string>("");
  const [ownerName, setOwnerName] = useState(defaultOwnerName);
  const [ownerPhone, setOwnerPhone] = useState(defaultOwnerPhone);
  const [tenantName, setTenantName] = useState(defaultTenantName);
  const [tenantPhone, setTenantPhone] = useState(defaultTenantPhone);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDate(defaultDate ? new Date(defaultDate + "T00:00:00") : new Date());
      setTimeLabel("");
      setOwnerName(defaultOwnerName);
      setOwnerPhone(defaultOwnerPhone);
      setTenantName(defaultTenantName);
      setTenantPhone(defaultTenantPhone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpen(val: boolean) {
    if (val) {
      setTitle(defaultTitle);
      setDate(defaultDate ? new Date(defaultDate + "T00:00:00") : new Date());
      setTimeLabel("");
      setOwnerName(defaultOwnerName);
      setOwnerPhone(defaultOwnerPhone);
      setTenantName(defaultTenantName);
      setTenantPhone(defaultTenantPhone);
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
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        tenant_name: tenantName.trim() || null,
        tenant_phone: tenantPhone.trim() || null,
      });
      if (!res.ok) { toast.error(res.message ?? "Failed to save"); return; }
      toast.success("Event saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-border" style={{ maxWidth: 460, padding: 0 }}>
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
        <div style={{ padding: "18px 22px", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Event name */}
          <p className="kk-overline mb-1.5">Event name</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. House viewing 3pm"
            autoFocus
            style={{
              width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10,
              padding: "10px 13px", fontSize: 14, color: "var(--kk-ink)",
              background: "var(--kk-surface)", outline: "none", fontFamily: "inherit", marginBottom: 16,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--kk-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--kk-line)")}
          />

          {/* Inline calendar — always visible */}
          <p className="kk-overline mb-2">Date</p>
          {date && (
            <p className="text-[13px] font-medium mb-2" style={{ color: "var(--kk-blue)" }}>
              {formatDisplay(date)}
            </p>
          )}
          <div style={{
            border: "1.5px solid var(--kk-line)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--kk-surface)",
            marginBottom: 14,
          }}>
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date ?? new Date()}
              onSelect={(d) => { if (d) setDate(d); }}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
            />
          </div>

          {/* Time */}
          <p className="kk-overline mb-1.5">Time <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></p>
          <select
            value={timeLabel}
            onChange={(e) => setTimeLabel(e.target.value)}
            style={{
              width: "100%", border: "1.5px solid var(--kk-line)", borderRadius: 10,
              padding: "10px 13px", fontSize: 14,
              color: timeLabel ? "var(--kk-ink)" : "var(--kk-ink-faint)",
              background: "var(--kk-surface)", appearance: "none", cursor: "pointer",
              fontFamily: "inherit", outline: "none", marginBottom: 16,
            }}
          >
            <option value="">No time set</option>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--kk-line)", margin: "4px 0 14px" }} />

          {/* Contacts */}
          <ContactField label="Owner" nameVal={ownerName} phoneVal={ownerPhone} onNameChange={setOwnerName} onPhoneChange={setOwnerPhone} />
          <ContactField label="Tenant" nameVal={tenantName} phoneVal={tenantPhone} onNameChange={setTenantName} onPhoneChange={setTenantPhone} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid var(--kk-line)" }}>
          <button type="button" onClick={() => onOpenChange(false)} disabled={pending} className="kk-pill kk-pill-ghost">
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
