"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchExpandedStats } from "./actions";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpandedDashboardStats, CalendarEvent } from "@/lib/db";
import { Layers, Banknote, CalendarDays, Building2, Users, FileText, Target } from "lucide-react";

const RANGE_OPTIONS = [
  { value: "1w", label: "1w", months: 1 },
  { value: "1m", label: "1m", months: 1 },
  { value: "3m", label: "3m", months: 3 },
  { value: "6m", label: "6m", months: 6 },
  { value: "12m", label: "12m", months: 12 },
  { value: "24m", label: "24m", months: 24 },
] as const;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${y}`;
}

function weekLabel(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(weekEnd + "T00:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sm = months[s.getMonth()];
  const em = months[e.getMonth()];
  if (s.getMonth() === e.getMonth()) return `Week of ${sm} ${s.getDate()} - ${e.getDate()}`;
  return `Week of ${sm} ${s.getDate()} - ${em} ${e.getDate()}`;
}

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const base = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return dates;
}

function getEventStyle(type: string | null): { bg: string; color: string } {
  if (type === "viewing")    return { bg: "rgba(0,113,227,0.12)",   color: "#0071E3" };
  if (type === "call")       return { bg: "rgba(52,199,89,0.15)",   color: "#1F8B4C" };
  if (type === "focus_time") return { bg: "rgba(175,82,222,0.12)", color: "#6F2DA8" };
  return { bg: "var(--kk-surface-2)", color: "var(--kk-ink)" };
}

function fmtDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  const t = new Date(today + "T00:00:00");
  t.setDate(t.getDate() + 1);
  const tStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  if (dateStr === tStr) return "Tomorrow";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

// ── Donut ring SVG ─────────────────────────────────────────────────────────────

const DONUT_SW = 12;

function DonutRing({ pct, strokeColor, trackColor, size = 76 }: { pct: number; strokeColor: string; trackColor: string; size?: number }) {
  const cx = size / 2;
  const r = cx - DONUT_SW;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={DONUT_SW} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={strokeColor} strokeWidth={DONUT_SW}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ── Commission sparkline (decorative) ─────────────────────────────────────────

function CommissionSparkline() {
  return (
    <svg width={110} height={52} viewBox="0 0 110 52" fill="none" style={{ display: "block" }}>
      <path
        d="M0 42 C10 38, 16 46, 26 40 C36 34, 40 44, 52 36 C64 28, 68 40, 80 30 C92 20, 98 28, 110 18"
        stroke="#1F8B4C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        opacity={0.55}
      />
    </svg>
  );
}

// ── Metric cards (top row) ─────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subValue,
  subLabel,
  progress,
  progressColor,
  href,
  sparkline,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  subLabel?: string;
  progress?: number;
  progressColor?: string;
  href: string;
  sparkline?: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 16,
        padding: "16px 16px 18px", cursor: "pointer", height: "100%", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative sparkline (absolute, bottom-right) */}
        {sparkline && (
          <div style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
            {sparkline}
          </div>
        )}

        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Icon style={{ width: 26, height: 26, color: iconColor }} />
        </div>

        {/* Label */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--kk-ink-mute)", marginBottom: 6 }}>
          {label}
        </p>

        {/* Value */}
        <p style={{ fontSize: 26, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 2 }}>
          {value}
          {subValue && (
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--kk-ink-mute)" }}>{" "}/{" "}{subValue}</span>
          )}
        </p>

        {subLabel && (
          <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginBottom: progress !== undefined ? 10 : 0 }}>
            {subLabel}
          </p>
        )}

        {progress !== undefined && (
          <div style={{ marginTop: subLabel ? 0 : 10 }}>
            <div style={{ height: 3, background: "var(--kk-line)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: progressColor ?? "var(--kk-blue)", borderRadius: 2, transition: "width 0.3s ease" }} />
            </div>
            <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", marginTop: 4 }}>{Math.round(progress)}% completed</p>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Weekly calendar ────────────────────────────────────────────────────────────

function WeeklyCalendar({ weekEvents, weekStart, weekEnd }: { weekEvents: CalendarEvent[]; weekStart: string; weekEnd: string }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const weekDates = getWeekDates(weekStart);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const byDate: Record<string, CalendarEvent[]> = {};
  for (const date of weekDates) byDate[date] = [];
  for (const ev of weekEvents) {
    if (byDate[ev.event_date]) byDate[ev.event_date].push(ev);
  }

  return (
    <Link href="/calendar" style={{
      display: "block", textDecoration: "none", background: "var(--kk-surface)",
      border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden",
      boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)", cursor: "pointer", height: "100%",
    }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
          This week{" "}<span style={{ fontWeight: 400, color: "var(--kk-ink-mute)" }}>({weekLabel(weekStart, weekEnd)})</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)" }}>View full calendar →</span>
      </div>

      {/* Desktop 7-column */}
      <div className="kk-week-desktop" style={{ display: "flex" }}>
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const isHovered = hoveredDay === i;
          const dayNum = new Date(date + "T00:00:00").getDate();
          const events = byDate[date] ?? [];
          const shown = events.slice(0, 3);
          const extra = events.length - shown.length;
          return (
            <div key={date}
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                flex: isHovered ? 2 : 1, transition: "flex 0.22s cubic-bezier(.32,.72,0,1)",
                borderRight: i < 6 ? "1px solid var(--kk-line)" : "none",
                padding: "10px 8px 12px", minHeight: 120, minWidth: 0, overflow: "hidden",
                background: isToday ? "rgba(0,113,227,0.04)" : isHovered ? "rgba(0,0,0,0.015)" : "transparent",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: isToday ? "var(--kk-blue)" : "var(--kk-ink-faint)", marginBottom: 4 }}>
                  {DAY_LABELS[i]}
                </p>
                {isToday ? (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--kk-blue)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    {dayNum}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>{dayNum}</span>
                )}
              </div>
              {events.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center" }}>–</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {shown.map((ev) => {
                    const s = getEventStyle(ev.event_type ?? null);
                    return (
                      <div key={ev.id} style={{ background: s.bg, borderRadius: 6, padding: "4px 6px" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: s.color, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</p>
                        {ev.event_time && <p style={{ fontSize: 9, color: s.color, marginTop: 2, opacity: 0.75 }}>{fmtTime(ev.event_time)}</p>}
                      </div>
                    );
                  })}
                  {extra > 0 && <p style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-blue)", textAlign: "center", marginTop: 2 }}>+{extra} more</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal chips */}
      <div className="kk-week-mobile" style={{ display: "none", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", padding: "12px 16px", gap: 10 }}>
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const dayNum = new Date(date + "T00:00:00").getDate();
          const events = byDate[date] ?? [];
          const extra = Math.max(0, events.length - 2);
          const shown = events.slice(0, 2);
          return (
            <div key={date} style={{ flexShrink: 0, minWidth: 72, background: isToday ? "rgba(0,113,227,0.08)" : "var(--kk-surface-2)", borderRadius: 12, padding: "10px", border: isToday ? "1px solid rgba(0,113,227,0.25)" : "1px solid var(--kk-line)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isToday ? "var(--kk-blue)" : "var(--kk-ink-faint)", marginBottom: 4 }}>{DAY_LABELS[i]}</p>
              {isToday ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--kk-blue)", color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{dayNum}</span>
              ) : (
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 6 }}>{dayNum}</p>
              )}
              {events.length === 0 ? (
                <p style={{ fontSize: 10, color: "var(--kk-ink-faint)" }}>–</p>
              ) : (
                <>
                  {shown.map((ev) => {
                    const s = getEventStyle(ev.event_type ?? null);
                    return <p key={ev.id} style={{ fontSize: 10, fontWeight: 500, color: s.color, lineHeight: 1.3, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60 }}>{ev.title}</p>;
                  })}
                  {extra > 0 && <p style={{ fontSize: 9, fontWeight: 600, color: "var(--kk-blue)" }}>+{extra} more</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Link>
  );
}

// ── Upcoming Viewings ──────────────────────────────────────────────────────────

function UpcomingViewings({ viewings }: { viewings: CalendarEvent[] }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

  return (
    <div style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0071E3" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>Upcoming viewings</span>
          {viewings.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(0,113,227,0.10)", color: "#0071E3", borderRadius: 8, padding: "2px 7px" }}>
              {viewings.length}
            </span>
          )}
        </div>
        <Link href="/calendar" style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)", textDecoration: "none" }}>All →</Link>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {viewings.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--kk-ink-faint)" }}>No upcoming viewings</p>
            <Link href="/calendar" style={{ fontSize: 12, color: "var(--kk-blue)", textDecoration: "none", display: "block", marginTop: 6 }}>Schedule one →</Link>
          </div>
        ) : (
          viewings.map((ev, idx) => (
            <div key={ev.id} style={{ padding: "10px 14px", borderBottom: idx < viewings.length - 1 ? "1px solid var(--kk-line)" : "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
              {/* Photo thumbnail */}
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", position: "relative" }}>
                {ev.cover_photo_url ? (
                  <Image src={ev.cover_photo_url} alt={ev.title} fill style={{ objectFit: "cover" }} sizes="56px" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 style={{ width: 20, height: 20, color: "var(--kk-ink-faint)" }} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#0071E3" }}>{fmtDateLabel(ev.event_date, today)}</span>
                  {ev.event_time && <span style={{ fontSize: 10, color: "var(--kk-ink-mute)" }}>{fmtTime(ev.event_time)}</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>{ev.title}</p>
                {(ev.subtitle || ev.tenant_name || ev.owner_name) && (
                  <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.subtitle || ev.tenant_name || ev.owner_name}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Pipeline funnel card ─────────────────────────────────────────────────────

interface FunnelStat { label: string; value: number | string }

function FunnelCard({
  icon: Icon, iconBg, iconColor,
  label, count, stats, href,
  donutPct, donutLabel,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  label: string;
  count: number;
  stats: FunnelStat[];
  href: string;
  donutPct: number;
  donutLabel: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", flex: 1, minWidth: 0 }}>
      <div style={{
        background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 16,
        padding: "16px 14px 18px", cursor: "pointer", height: "100%", position: "relative", overflow: "hidden",
      }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon style={{ width: 26, height: 26, color: iconColor }} />
        </div>

        {/* Donut — absolute top-right */}
        <div style={{ position: "absolute", right: 10, top: 14, width: 90, height: 90 }}>
          <DonutRing pct={donutPct} strokeColor={iconColor} trackColor={iconBg} size={90} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: iconColor }}>{donutPct}%</span>
            <span style={{ fontSize: 7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: iconColor, opacity: 0.65, maxWidth: 52, lineHeight: 1.3, marginTop: 2 }}>
              {donutLabel}
            </span>
          </div>
        </div>

        {/* Left content */}
        <div style={{ paddingRight: 96 }}>
          <p style={{ fontSize: 30, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>
            {count.toLocaleString()}
          </p>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: iconColor, marginBottom: 10 }}>
            {label}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </p>
                <p style={{ fontSize: 10, color: "var(--kk-ink-mute)", marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Export canvas helper (kept for PDF/image export feature)
async function buildExportCanvas(startMonth: string, rangeKey: string, gridEl: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;
  const S = 2;
  const cardsCanvas = await html2canvas(gridEl, { scale: S, backgroundColor: "#FBFBFD", useCORS: true, logging: false });
  const W = cardsCanvas.width;
  const headerH = 88 * S;
  const sepH = 1;
  const footerH = 26 * S;
  const H = headerH + sepH + cardsCanvas.height + footerH;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FBFBFD";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.fillRect(0, headerH, W, sepH);
  ctx.drawImage(cardsCanvas, 0, headerH + sepH);
  ctx.fillStyle = "rgba(29,29,31,0.20)";
  ctx.font = `${11 * S}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("kakisewa.com  ·  Confidential", W / 2, headerH + sepH + cardsCanvas.height + footerH - 8 * S);
  const lx = 40 * S;
  const logoBaseY = Math.round(headerH * 0.52);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1D1D1F";
  ctx.font = `bold ${30 * S}px Georgia, 'DM Serif Display', serif`;
  const kW = ctx.measureText("k").width;
  ctx.fillText("k", lx, logoBaseY);
  ctx.font = `${24 * S}px Georgia, 'DM Serif Display', serif`;
  ctx.fillText("kakisewa", lx + kW + 8 * S, logoBaseY);
  ctx.fillStyle = "rgba(29,29,31,0.42)";
  ctx.font = `600 ${8 * S}px 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif`;
  "カキセワ".split("").forEach((c, i) => { ctx.fillText(c, lx + kW + 8 * S + i * 11 * S, logoBaseY + 14 * S); });
  ctx.fillStyle = "rgba(29,29,31,0.30)";
  ctx.font = `${9 * S}px Arial, sans-serif`;
  ctx.fillText(`PROPERTY SNAPSHOT  ·  ${fmtMonthLabel(startMonth)}  ·  ${rangeKey} window`, lx, logoBaseY + 28 * S);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillStyle = "rgba(29,29,31,0.38)";
  ctx.font = `${11 * S}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`Generated: ${date}`, W - 40 * S, logoBaseY);
  return canvas;
}

async function doExportPDF(startMonth: string, rangeKey: string, gridEl: HTMLElement) {
  const canvas = await buildExportCanvas(startMonth, rangeKey, gridEl);
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const { jsPDF } = await import("jspdf");
  const pdfW = 297;
  const pdfH = Math.round((canvas.height / canvas.width) * pdfW);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, pdfH] });
  doc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
  doc.save(`kakisewa-snapshot-${date.replace(/ /g, "-")}.pdf`);
}

async function doExportImage(startMonth: string, rangeKey: string, gridEl: HTMLElement) {
  const canvas = await buildExportCanvas(startMonth, rangeKey, gridEl);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const link = document.createElement("a");
  link.download = `kakisewa-snapshot-${date.replace(/ /g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Main section ───────────────────────────────────────────────────────────────

export function StatsSection({
  initialStats,
  weekEvents,
  weekStart,
  weekEnd,
  mtdCommission,
  upcomingViewings,
  cardCount,
  cardCap,
  planName,
}: {
  initialStats: ExpandedDashboardStats;
  weekEvents: CalendarEvent[];
  weekStart: string;
  weekEnd: string;
  mtdCommission: number;
  upcomingViewings: CalendarEvent[];
  cardCount: number;
  cardCap: number;
  planName: string;
}) {
  const todayMonthValue = new Date().toISOString().slice(0, 7);
  const [startMonth, setStartMonth] = useState(todayMonthValue);
  const [rangeKey, setRangeKey] = useState<string>("3m");
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const viewingsToday = (weekEvents ?? []).filter(e => e.event_date === today && e.event_type === "viewing").length;
  const safeCardCount = cardCount ?? 0;
  const safeCardCap = cardCap ?? 400;
  const cardUsagePct = safeCardCap > 0 ? (safeCardCount / safeCardCap) * 100 : 0;
  const cardUsageColor = cardUsagePct >= 100 ? "var(--kk-red)" : cardUsagePct >= 80 ? "var(--kk-amber)" : "var(--kk-green)";
  const commFormatted = (mtdCommission ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function getRangeMonths(key: string): number {
    return RANGE_OPTIONS.find((o) => o.value === key)?.months ?? 3;
  }
  function refetch(months: number, month: string) {
    startTransition(async () => { const fresh = await fetchExpandedStats(months, month); setStats(fresh); });
  }
  function handleMonthChange(month: string) { setStartMonth(month); refetch(getRangeMonths(rangeKey), month); }
  function handleRangeChange(key: string | null) { if (!key) return; setRangeKey(key); refetch(getRangeMonths(key), startMonth); }

  const contactedPct = stats.totalUploaded > 0 ? Math.round((stats.totalContacted / stats.totalUploaded) * 100) : 0;
  const myAvailPct = stats.existingTotalActiveCount > 0 ? Math.round((stats.existingExpiringCount / stats.existingTotalActiveCount) * 100) : 0;
  const existingTotal = stats.existingTotalActiveCount + stats.existingExpiredCount;
  const existingAtRiskPct = existingTotal > 0 ? Math.round(((stats.existingExpiringIn60Count + stats.existingExpiredCount) / existingTotal) * 100) : 0;
  const targetAtRiskPct = stats.targetTotalCount > 0 ? Math.round((stats.targetExpiringIn60Count / stats.targetTotalCount) * 100) : 0;

  void doExportPDF; void doExportImage;

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s ease" }}>

      {/* Top metric row — 4 white cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={Layers}
          iconBg="rgba(0,113,227,0.10)"
          iconColor="#0071E3"
          label="Card usage"
          value={safeCardCount.toLocaleString()}
          subValue={safeCardCap.toLocaleString()}
          subLabel={(planName ?? "") + " plan"}
          progress={cardUsagePct}
          progressColor={cardUsageColor}
          href="/subscription"
        />
        <MetricCard
          icon={Banknote}
          iconBg="rgba(52,199,89,0.12)"
          iconColor="#1F8B4C"
          label="Commission this month"
          value={"RM " + commFormatted}
          subLabel="earned this month"
          href="/performance"
          sparkline={<CommissionSparkline />}
        />
        <MetricCard
          icon={CalendarDays}
          iconBg="rgba(0,113,227,0.10)"
          iconColor="#0071E3"
          label="Viewings today"
          value={String(viewingsToday)}
          subValue="3"
          subLabel="daily goal"
          progress={(viewingsToday / 3) * 100}
          progressColor="#0071E3"
          href="/calendar"
        />
        <MetricCard
          icon={Building2}
          iconBg="rgba(111,45,168,0.10)"
          iconColor="#6F2DA8"
          label="My listings"
          value={(stats.totalListedCount ?? 0).toLocaleString()}
          subLabel="listings in progress"
          href="/my-listing"
        />
      </div>

      {/* Calendar + Upcoming Viewings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4" style={{ minHeight: 240 }}>
        <div className="lg:col-span-2">
          <WeeklyCalendar weekEvents={weekEvents} weekStart={weekStart} weekEnd={weekEnd} />
        </div>
        <div>
          <UpcomingViewings viewings={upcomingViewings} />
        </div>
      </div>

      {/* Range controls */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <MonthPickerPill value={startMonth} onChange={handleMonthChange} />
        <Select value={rangeKey} onValueChange={handleRangeChange}>
          <SelectTrigger className="font-medium gap-1 [&_svg]:size-3"
            style={{ height: "auto", padding: "2px 8px", borderRadius: 12, border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)", color: "var(--kk-ink)", fontSize: 10 }}>
            <SelectValue>{rangeKey}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[72px] text-[12px]">
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="py-1.5 text-[12px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline funnel */}
      <div ref={gridRef}>
        {/* Desktop: 1 row with arrows */}
        <div className="hidden lg:flex items-stretch gap-0 mb-3">
          <FunnelCard icon={Users} iconBg="rgba(0,113,227,0.10)" iconColor="#0071E3"
            label="Property Leads" count={stats.totalUploaded ?? 0}
            stats={[{ label: "Contacted", value: stats.totalContacted ?? 0 }, { label: "Not contacted", value: (stats.totalUploaded ?? 0) - (stats.totalContacted ?? 0) }]}
            href="/property-leads" donutPct={contactedPct} donutLabel="contacted" />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard icon={Building2} iconBg="rgba(111,45,168,0.10)" iconColor="#6F2DA8"
            label="My Listing" count={stats.totalListedCount ?? 0}
            stats={[{ label: "For rent", value: stats.listedRentCount ?? 0 }, { label: "For sale", value: stats.listedSaleCount ?? 0 }]}
            href="/my-listing" donutPct={myAvailPct} donutLabel="avail. in 3m" />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard icon={FileText} iconBg="rgba(52,199,89,0.12)" iconColor="#1F8B4C"
            label="Existing Listing" count={(stats.existingTotalActiveCount ?? 0) + (stats.existingExpiredCount ?? 0)}
            stats={[{ label: "Expired", value: stats.existingExpiredCount ?? 0 }, { label: "Expiring 60d", value: stats.existingExpiringIn60Count ?? 0 }, { label: "Renewing", value: stats.existingRenewingCount ?? 0 }]}
            href="/existing-listing" donutPct={existingAtRiskPct} donutLabel="expiring / expired" />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard icon={Target} iconBg="rgba(255,149,0,0.12)" iconColor="#B45309"
            label="Lost Listing" count={stats.targetTotalCount ?? 0}
            stats={[{ label: "Expiring 60d", value: stats.targetExpiringIn60Count ?? 0 }, { label: "Watching", value: stats.targetWatchingCount ?? 0 }]}
            href="/lost-listing" donutPct={targetAtRiskPct} donutLabel="expiring / expired" />
        </div>

        {/* Mobile: 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 lg:hidden mb-3">
          <FunnelCard icon={Users} iconBg="rgba(0,113,227,0.10)" iconColor="#0071E3"
            label="Property Leads" count={stats.totalUploaded ?? 0}
            stats={[{ label: "Contacted", value: stats.totalContacted ?? 0 }, { label: "Not yet", value: (stats.totalUploaded ?? 0) - (stats.totalContacted ?? 0) }]}
            href="/property-leads" donutPct={contactedPct} donutLabel="contacted" />
          <FunnelCard icon={Building2} iconBg="rgba(111,45,168,0.10)" iconColor="#6F2DA8"
            label="My Listing" count={stats.totalListedCount ?? 0}
            stats={[{ label: "For rent", value: stats.listedRentCount ?? 0 }, { label: "For sale", value: stats.listedSaleCount ?? 0 }]}
            href="/my-listing" donutPct={myAvailPct} donutLabel="avail. in 3m" />
          <FunnelCard icon={FileText} iconBg="rgba(52,199,89,0.12)" iconColor="#1F8B4C"
            label="Existing Listing" count={(stats.existingTotalActiveCount ?? 0) + (stats.existingExpiredCount ?? 0)}
            stats={[{ label: "Expired", value: stats.existingExpiredCount ?? 0 }, { label: "Expiring 60d", value: stats.existingExpiringIn60Count ?? 0 }]}
            href="/existing-listing" donutPct={existingAtRiskPct} donutLabel="expiring" />
          <FunnelCard icon={Target} iconBg="rgba(255,149,0,0.12)" iconColor="#B45309"
            label="Lost Listing" count={stats.targetTotalCount ?? 0}
            stats={[{ label: "Expiring 60d", value: stats.targetExpiringIn60Count ?? 0 }, { label: "Watching", value: stats.targetWatchingCount ?? 0 }]}
            href="/lost-listing" donutPct={targetAtRiskPct} donutLabel="expiring" />
        </div>
      </div>
    </div>
  );
}
