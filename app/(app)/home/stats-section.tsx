"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { fetchExpandedStats } from "./actions";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpandedDashboardStats, CalendarEvent } from "@/lib/db";

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

// Returns the 7 dates for Mon–Sun of the given weekStart
function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const base = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    // Use local getters (not toISOString) so UTC offset doesn't shift the calendar date
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return dates;
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
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--kk-line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
          This week{" "}
          <span style={{ fontWeight: 400, color: "var(--kk-ink-mute)" }}>
            ({weekLabel(weekStart, weekEnd)})
          </span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)" }}>
          View full calendar →
        </span>
      </div>

      {/* Desktop: 7-column flex (hover-expand per column) */}
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
              {/* Day header */}
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

              {/* Events */}
              {events.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center" }}>–</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {shown.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        background: "var(--kk-surface-2)",
                        borderRadius: 6,
                        padding: "4px 6px",
                      }}
                    >
                      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.title}
                      </p>
                      {ev.event_time && (
                        <p style={{ fontSize: 9, color: "var(--kk-ink-mute)", marginTop: 2 }}>
                          {fmtTime(ev.event_time)}
                        </p>
                      )}
                    </div>
                  ))}
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
                padding: "10px 10px 10px",
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
                  {shown.map((ev) => (
                    <p key={ev.id} style={{ fontSize: 10, fontWeight: 500, color: "var(--kk-ink)", lineHeight: 1.3, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60 }}>
                      {ev.title}
                    </p>
                  ))}
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

// ── Stat card with donut ───────────────────────────────────────────────────────

interface BlockStat {
  label: string;
  value: number | string;
}

function Block({
  overline,
  primaryNum,
  primaryLabel,
  stats,
  href,
  bg,
  bannerColor,
  inkColor,
  trackAlpha,
  donutPct,
  donutLabel,
}: {
  overline: string;
  primaryNum: number;
  primaryLabel: string;
  stats: BlockStat[];
  href: string;
  bg: string;
  bannerColor: string;
  inkColor: string;
  trackAlpha: string;
  donutPct: number;
  donutLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group hover:-translate-y-1 hover:shadow-xl"
      style={{
        textDecoration: "none",
        borderRadius: 22,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 0.18s cubic-bezier(.32,.72,0,1), box-shadow 0.18s",
      }}
    >
      {/* Banner */}
      <div style={{ background: bannerColor, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.88)", margin: 0 }}>
          {overline}
        </p>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1 }}>↗</span>
      </div>

      {/* Body */}
      <div style={{ background: bg, color: inkColor, padding: "18px 20px 20px", flex: 1, position: "relative", overflow: "hidden", minHeight: 160 }}>
        {/* Donut — large, anchored right, vertically centered, fully within bounds */}
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 116, height: 116, flexShrink: 0 }}>
          <DonutRing pct={donutPct} strokeColor={inkColor} trackColor={trackAlpha} size={116} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: inkColor }}>{donutPct}%</span>
            <span style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginTop: 4, maxWidth: 64, textAlign: "center", lineHeight: 1.3, color: inkColor }}>
              {donutLabel}
            </span>
          </div>
        </div>

        {/* Left: number + label + sub-stats */}
        <div style={{ paddingRight: 108 }}>
          <p style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", color: inkColor }}>
            {primaryNum.toLocaleString()}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.65, marginTop: 5, marginBottom: 18, color: inkColor }}>
            {primaryLabel}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: inkColor }}>
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </p>
                <p style={{ fontSize: 11, fontWeight: 500, opacity: 0.55, marginTop: 3, color: inkColor }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Export canvas helper (unchanged — kept for PDF/image export feature)
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
}: {
  initialStats: ExpandedDashboardStats;
  weekEvents: CalendarEvent[];
  weekStart: string;
  weekEnd: string;
}) {
  const todayMonthValue = new Date().toISOString().slice(0, 7);
  const [startMonth, setStartMonth] = useState(todayMonthValue);
  const [rangeKey, setRangeKey] = useState<string>("3m");
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);

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

  // ── Donut percentages ──────────────────────────────────────────────────────
  const contactedPct = stats.totalUploaded > 0
    ? Math.round((stats.totalContacted / stats.totalUploaded) * 100)
    : 0;

  // My Listing: % active tenancies expiring within selected window (becoming available)
  const myAvailPct = stats.existingTotalActiveCount > 0
    ? Math.round((stats.existingExpiringCount / stats.existingTotalActiveCount) * 100)
    : 0;

  // Existing: % expired + expiring in 60d out of (active + expired)
  const existingTotal = stats.existingTotalActiveCount + stats.existingExpiredCount;
  const existingAtRiskPct = existingTotal > 0
    ? Math.round(((stats.existingExpiringIn60Count + stats.existingExpiredCount) / existingTotal) * 100)
    : 0;

  // Target: % expiring in 60d out of total
  const targetAtRiskPct = stats.targetTotalCount > 0
    ? Math.round((stats.targetExpiringIn60Count / stats.targetTotalCount) * 100)
    : 0;

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s ease" }}>

      {/* Weekly calendar */}
      <WeeklyCalendar weekEvents={weekEvents} weekStart={weekStart} weekEnd={weekEnd} />

      {/* Range controls — after calendar */}
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

      {/* 4 stat cards — 1 col mobile, 2 col sm+ */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Block
          overline="Property Leads"
          primaryNum={stats.totalUploaded}
          primaryLabel="owner contacts imported"
          stats={[
            { label: "Contacted", value: stats.totalContacted },
            { label: "Not contacted", value: stats.totalUploaded - stats.totalContacted },
          ]}
          href="/property-leads"
          bannerColor="#1A4FA3"
          bg="rgba(0,113,227,0.09)"
          inkColor="#0A3880"
          trackAlpha="rgba(10,56,128,0.15)"
          donutPct={contactedPct}
          donutLabel="contacted"
        />

        <Block
          overline="My listing"
          primaryNum={stats.totalListedCount}
          primaryLabel="listings in progress"
          stats={[
            { label: "For rent", value: stats.listedRentCount },
            { label: "For sale", value: stats.listedSaleCount },
          ]}
          href="/my-listing"
          bannerColor="#4A1490"
          bg="rgba(175,82,222,0.09)"
          inkColor="#3A0E7A"
          trackAlpha="rgba(58,14,122,0.15)"
          donutPct={myAvailPct}
          donutLabel="avail. in 3m"
        />

        <Block
          overline="Existing listing"
          primaryNum={stats.existingTotalActiveCount + stats.existingExpiredCount}
          primaryLabel="active tenancies"
          stats={[
            { label: "Already expired", value: stats.existingExpiredCount },
            { label: "Expiring in 60d", value: stats.existingExpiringIn60Count },
            { label: "Renewing", value: stats.existingRenewingCount },
          ]}
          href="/existing-listing"
          bannerColor="#1A6B35"
          bg="rgba(52,199,89,0.09)"
          inkColor="#145228"
          trackAlpha="rgba(20,82,40,0.15)"
          donutPct={existingAtRiskPct}
          donutLabel="expiring / expired"
        />

        <Block
          overline="Target listing"
          primaryNum={stats.targetTotalCount}
          primaryLabel="competitor properties tracked"
          stats={[
            { label: "Expiring in 60d", value: stats.targetExpiringIn60Count },
            { label: "Already expired", value: Math.max(0, stats.targetTotalCount - stats.targetTotalActiveCount) },
            { label: "Watching", value: stats.targetWatchingCount },
          ]}
          href="/lost-listing"
          bannerColor="#7A3800"
          bg="rgba(255,149,0,0.09)"
          inkColor="#5C2800"
          trackAlpha="rgba(92,40,0,0.15)"
          donutPct={targetAtRiskPct}
          donutLabel="expiring / expired"
        />
      </div>
    </div>
  );
}
