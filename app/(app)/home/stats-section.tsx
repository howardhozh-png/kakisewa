"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { fetchExpandedStats } from "./actions";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpandedDashboardStats, CalendarEvent } from "@/lib/db";
import { CreditCard, Banknote, CalendarDays, Phone, Users, Building2, FileText, Target } from "lucide-react";

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
  if (s.getMonth() === e.getMonth()) {
    return `Week of ${sm} ${s.getDate()} - ${e.getDate()}`;
  }
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

const DONUT_SW = 14;

function DonutRing({ pct, strokeColor, trackColor, size = 76 }: { pct: number; strokeColor: string; trackColor: string; size?: number }) {
  const cx = size / 2;
  const r = cx - DONUT_SW;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={DONUT_SW} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={strokeColor} strokeWidth={DONUT_SW}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
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
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          background: "var(--kk-surface)",
          border: "1px solid var(--kk-line)",
          borderRadius: 16,
          padding: "14px 16px 16px",
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--kk-ink-mute)", marginBottom: 6 }}>
          {label}
        </p>
        <p style={{ fontSize: 26, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 2 }}>
          {value}
          {subValue && (
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--kk-ink-mute)" }}>
              {" "}/{" "}{subValue}
            </span>
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
            <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", marginTop: 4 }}>
              {Math.round(progress)}% completed
            </p>
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
    <Link
      href="/calendar"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--kk-surface)",
        border: "1px solid var(--kk-line)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)",
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
          This week{" "}
          <span style={{ fontWeight: 400, color: "var(--kk-ink-mute)" }}>({weekLabel(weekStart, weekEnd)})</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)" }}>View full calendar →</span>
      </div>

      {/* Desktop: 7-column hover-expand */}
      <div className="kk-week-desktop" style={{ display: "flex" }}>
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const isHovered = hoveredDay === i;
          const dayNum = new Date(date + "T00:00:00").getDate();
          const events = byDate[date] ?? [];
          const shown = events.slice(0, 3);
          const extra = events.length - shown.length;

          return (
            <div
              key={date}
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                flex: isHovered ? 2 : 1,
                transition: "flex 0.22s cubic-bezier(.32,.72,0,1)",
                borderRight: i < 6 ? "1px solid var(--kk-line)" : "none",
                padding: "10px 8px 12px",
                minHeight: 120,
                minWidth: 0,
                overflow: "hidden",
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
                    const style = getEventStyle(ev.event_type ?? null);
                    return (
                      <div key={ev.id} style={{ background: style.bg, borderRadius: 6, padding: "4px 6px" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: style.color, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ev.title}
                        </p>
                        {ev.event_time && (
                          <p style={{ fontSize: 9, color: style.color, marginTop: 2, opacity: 0.75 }}>
                            {fmtTime(ev.event_time)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {extra > 0 && (
                    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-blue)", textAlign: "center", marginTop: 2 }}>
                      +{extra} more
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll chips */}
      <div
        className="kk-week-mobile"
        style={{
          display: "none",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "12px 16px",
          gap: 10,
        }}
      >
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const dayNum = new Date(date + "T00:00:00").getDate();
          const events = byDate[date] ?? [];
          const extra = Math.max(0, events.length - 2);
          const shown = events.slice(0, 2);

          return (
            <div
              key={date}
              style={{
                flexShrink: 0,
                minWidth: 72,
                background: isToday ? "rgba(0,113,227,0.08)" : "var(--kk-surface-2)",
                borderRadius: 12,
                padding: "10px",
                border: isToday ? "1px solid rgba(0,113,227,0.25)" : "1px solid var(--kk-line)",
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isToday ? "var(--kk-blue)" : "var(--kk-ink-faint)", marginBottom: 4 }}>
                {DAY_LABELS[i]}
              </p>
              {isToday ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--kk-blue)", color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {dayNum}
                </span>
              ) : (
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 6 }}>{dayNum}</p>
              )}
              {events.length === 0 ? (
                <p style={{ fontSize: 10, color: "var(--kk-ink-faint)" }}>–</p>
              ) : (
                <>
                  {shown.map((ev) => {
                    const style = getEventStyle(ev.event_type ?? null);
                    return (
                      <p key={ev.id} style={{ fontSize: 10, fontWeight: 500, color: style.color, lineHeight: 1.3, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60 }}>
                        {ev.title}
                      </p>
                    );
                  })}
                  {extra > 0 && (
                    <p style={{ fontSize: 9, fontWeight: 600, color: "var(--kk-blue)" }}>+{extra} more</p>
                  )}
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
  if (viewings.length === 0) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

  return (
    <div style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0071E3" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>Upcoming viewings</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(0,113,227,0.10)", color: "#0071E3", borderRadius: 8, padding: "2px 7px" }}>
            {viewings.length}
          </span>
        </div>
        <Link href="/calendar" style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)", textDecoration: "none" }}>
          View all →
        </Link>
      </div>

      {viewings.map((ev, idx) => (
        <div
          key={ev.id}
          style={{
            padding: "12px 18px",
            borderBottom: idx < viewings.length - 1 ? "1px solid var(--kk-line)" : "none",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ width: 3, minHeight: 46, borderRadius: 2, background: "#0071E3", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0071E3" }}>
                {fmtDateLabel(ev.event_date, today)}
              </span>
              {ev.event_time && (
                <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>{fmtTime(ev.event_time)}</span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
              {ev.title}
            </p>
            {(ev.subtitle || ev.tenant_name || ev.owner_name) && (
              <p style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>
                {ev.subtitle || ev.tenant_name || ev.owner_name}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline funnel card ────────────────────────────────────────────────────────

function FunnelCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  count,
  sublabel,
  href,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  label: string;
  count: number;
  sublabel: string;
  href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", flex: 1, minWidth: 0 }}>
      <div
        style={{
          background: "var(--kk-surface)",
          border: "1px solid var(--kk-line)",
          borderRadius: 14,
          padding: "16px 14px",
          textAlign: "center",
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <Icon style={{ width: 20, height: 20, color: iconColor }} />
        </div>
        <p style={{ fontSize: 26, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>
          {count.toLocaleString()}
        </p>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: iconColor, marginBottom: 3 }}>
          {label}
        </p>
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", lineHeight: 1.4 }}>{sublabel}</p>
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
  const notContacted = (stats.totalUploaded ?? 0) - (stats.totalContacted ?? 0);
  const cardUsagePct = (cardCap ?? 0) > 0 ? ((cardCount ?? 0) / (cardCap ?? 1)) * 100 : 0;
  const safeCardCount = cardCount ?? 0;
  const safeCardCap = cardCap ?? 400;
  const cardUsageColor = cardUsagePct >= 100 ? "var(--kk-red)" : cardUsagePct >= 80 ? "var(--kk-amber)" : "var(--kk-green)";
  const commFormatted = (mtdCommission ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function getRangeMonths(key: string): number {
    return RANGE_OPTIONS.find((o) => o.value === key)?.months ?? 3;
  }

  function refetch(months: number, month: string) {
    startTransition(async () => {
      const fresh = await fetchExpandedStats(months, month);
      setStats(fresh);
    });
  }

  function handleMonthChange(month: string) {
    setStartMonth(month);
    refetch(getRangeMonths(rangeKey), month);
  }

  function handleRangeChange(key: string | null) {
    if (!key) return;
    setRangeKey(key);
    refetch(getRangeMonths(key), startMonth);
  }

  const contactedPct = stats.totalUploaded > 0
    ? Math.round((stats.totalContacted / stats.totalUploaded) * 100)
    : 0;
  const myAvailPct = stats.existingTotalActiveCount > 0
    ? Math.round((stats.existingExpiringCount / stats.existingTotalActiveCount) * 100)
    : 0;
  const existingTotal = stats.existingTotalActiveCount + stats.existingExpiredCount;
  const existingAtRiskPct = existingTotal > 0
    ? Math.round(((stats.existingExpiringIn60Count + stats.existingExpiredCount) / existingTotal) * 100)
    : 0;
  const targetAtRiskPct = stats.targetTotalCount > 0
    ? Math.round((stats.targetExpiringIn60Count / stats.targetTotalCount) * 100)
    : 0;

  void contactedPct; void myAvailPct; void existingAtRiskPct; void targetAtRiskPct;

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s ease" }}>

      {/* Top metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={CreditCard}
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
          icon={Phone}
          iconBg="rgba(255,149,0,0.12)"
          iconColor="#B45309"
          label="Owners not contacted"
          value={notContacted.toLocaleString()}
          subLabel="yet to be called"
          href="/property-leads"
        />
      </div>

      {/* Weekly calendar */}
      <WeeklyCalendar weekEvents={weekEvents} weekStart={weekStart} weekEnd={weekEnd} />

      {/* Upcoming viewings */}
      <UpcomingViewings viewings={upcomingViewings} />

      {/* Range controls */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <MonthPickerPill value={startMonth} onChange={handleMonthChange} />
        <Select value={rangeKey} onValueChange={handleRangeChange}>
          <SelectTrigger
            className="font-medium gap-1 [&_svg]:size-3"
            style={{ height: "auto", padding: "2px 8px", borderRadius: 12, border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)", color: "var(--kk-ink)", fontSize: 10 }}
          >
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
          <FunnelCard
            icon={Users}
            iconBg="rgba(0,113,227,0.10)"
            iconColor="#0071E3"
            label="Property Leads"
            count={stats.totalUploaded}
            sublabel={`${stats.totalContacted} contacted`}
            href="/property-leads"
          />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard
            icon={Building2}
            iconBg="rgba(111,45,168,0.10)"
            iconColor="#6F2DA8"
            label="My Listing"
            count={stats.totalListedCount}
            sublabel={`${stats.listedRentCount} rent · ${stats.listedSaleCount} sale`}
            href="/my-listing"
          />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard
            icon={FileText}
            iconBg="rgba(52,199,89,0.12)"
            iconColor="#1F8B4C"
            label="Existing Listing"
            count={stats.existingTotalActiveCount}
            sublabel={`${stats.existingExpiringIn60Count} expiring in 60d`}
            href="/existing-listing"
          />
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--kk-ink-faint)", fontSize: 18, flexShrink: 0 }}>→</div>
          <FunnelCard
            icon={Target}
            iconBg="rgba(255,149,0,0.12)"
            iconColor="#B45309"
            label="Lost Listing"
            count={stats.targetTotalCount}
            sublabel={`${stats.targetExpiringIn60Count} expiring soon`}
            href="/lost-listing"
          />
        </div>

        {/* Mobile: 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 lg:hidden mb-3">
          <FunnelCard
            icon={Users}
            iconBg="rgba(0,113,227,0.10)"
            iconColor="#0071E3"
            label="Property Leads"
            count={stats.totalUploaded}
            sublabel={`${stats.totalContacted} contacted`}
            href="/property-leads"
          />
          <FunnelCard
            icon={Building2}
            iconBg="rgba(111,45,168,0.10)"
            iconColor="#6F2DA8"
            label="My Listing"
            count={stats.totalListedCount}
            sublabel={`${stats.listedRentCount} rent · ${stats.listedSaleCount} sale`}
            href="/my-listing"
          />
          <FunnelCard
            icon={FileText}
            iconBg="rgba(52,199,89,0.12)"
            iconColor="#1F8B4C"
            label="Existing Listing"
            count={stats.existingTotalActiveCount}
            sublabel={`${stats.existingExpiringIn60Count} expiring in 60d`}
            href="/existing-listing"
          />
          <FunnelCard
            icon={Target}
            iconBg="rgba(255,149,0,0.12)"
            iconColor="#B45309"
            label="Lost Listing"
            count={stats.targetTotalCount}
            sublabel={`${stats.targetExpiringIn60Count} expiring soon`}
            href="/lost-listing"
          />
        </div>
      </div>
    </div>
  );
}
