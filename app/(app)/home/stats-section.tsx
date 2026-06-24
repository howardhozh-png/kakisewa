"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { RadialBarChart, RadialBar, PolarRadiusAxis, Label } from "recharts";
import { fetchExpandedStats, fetchCalendarMonth } from "./actions";
import { MonthPickerPill } from "@/components/month-picker-pill";
import type { ExpandedDashboardStats, CalendarEvent } from "@/lib/db";
import { Layers, Banknote, CalendarDays, Building2, Users, FileText, Target } from "lucide-react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

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
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function getEventStyle(type: string | null): { bg: string; color: string } {
  if (type === "viewing")    return { bg: "rgba(0,113,227,0.12)",  color: "#0071E3" };
  if (type === "call")       return { bg: "rgba(52,199,89,0.15)",  color: "#1F8B4C" };
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

// ── Commission sparkline with gradient area ────────────────────────────────────

function CommissionSparkline() {
  return (
    <svg width={120} height={52} viewBox="0 0 120 52" fill="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="cs-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34C759" stopOpacity={0.38} />
          <stop offset="100%" stopColor="#34C759" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M0 46 C12 42, 20 48, 32 40 C44 32, 52 44, 65 34 C78 24, 85 38, 98 26 C106 18, 112 22, 120 14 L120 52 L0 52 Z"
        fill="url(#cs-grad)"
      />
      <path
        d="M0 46 C12 42, 20 48, 32 40 C44 32, 52 44, 65 34 C78 24, 85 38, 98 26 C106 18, 112 22, 120 14"
        stroke="#34C759" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Metric cards (top row) — horizontal layout ─────────────────────────────────

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
        {sparkline && (
          <div style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
            {sparkline}
          </div>
        )}

        {/* Horizontal: icon left, text right */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: 26, height: 26, color: iconColor }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--kk-ink-mute)", marginBottom: 4 }}>
              {label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {value}
              {subValue && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--kk-ink-mute)" }}>{" "}/{" "}{subValue}</span>}
            </p>
            {subLabel && (
              <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginTop: 3 }}>{subLabel}</p>
            )}
          </div>
        </div>

        {progress !== undefined && (
          <div style={{ marginTop: 12 }}>
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

// ── Full month calendar ────────────────────────────────────────────────────────

function MonthCalendar({ events, yearMonth }: { events: CalendarEvent[]; yearMonth: string }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [y, m] = yearMonth.split("-").map(Number);

  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!byDate[ev.event_date]) byDate[ev.event_date] = [];
    byDate[ev.event_date].push(ev);
  }

  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // 0 = Mon

  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalRows = cells.length / 7;

  return (
    <Link href="/calendar" style={{
      display: "block", textDecoration: "none", background: "var(--kk-surface)",
      border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden",
      boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)", height: "100%",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>{MONTH_NAMES[m - 1]} {y}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)" }}>View full calendar →</span>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--kk-line)" }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ padding: "7px 0", textAlign: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--kk-ink-faint)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((day, i) => {
          const colIdx = i % 7;
          const rowIdx = Math.floor(i / 7);
          const isLastRow = rowIdx === totalRows - 1;
          const borderRight = colIdx < 6 ? "1px solid var(--kk-line)" : "none";
          const borderBottom = !isLastRow ? "1px solid var(--kk-line)" : "none";

          if (!day) {
            return (
              <div key={i} style={{ borderRight, borderBottom, minHeight: 64, background: "rgba(0,0,0,0.015)" }} />
            );
          }

          const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday = dateStr === today;
          const dayEvents = byDate[dateStr] ?? [];
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;

          return (
            <div key={i} style={{ borderRight, borderBottom, minHeight: 64, padding: "5px 4px", background: isToday ? "rgba(0,113,227,0.04)" : "transparent" }}>
              {/* Day number */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
                {isToday ? (
                  <span style={{ width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--kk-blue)", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700 }}>
                    {day}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-ink)" }}>{day}</span>
                )}
              </div>

              {/* Desktop: event title pills */}
              <div className="hidden lg:flex" style={{ flexDirection: "column", gap: 2 }}>
                {shown.map((ev) => {
                  const s = getEventStyle(ev.event_type ?? null);
                  return (
                    <div key={ev.id} style={{ background: s.bg, borderRadius: 3, padding: "2px 4px" }}>
                      <p style={{ fontSize: 9, fontWeight: 500, color: s.color, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.event_time && <span style={{ opacity: 0.85 }}>{fmtTime(ev.event_time)} </span>}
                        {ev.title}
                      </p>
                    </div>
                  );
                })}
                {extra > 0 && (
                  <p style={{ fontSize: 9, fontWeight: 600, color: "var(--kk-blue)", paddingLeft: 2 }}>+{extra} more</p>
                )}
              </div>

              {/* Mobile: colored dots */}
              <div className="lg:hidden" style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
                {dayEvents.slice(0, 5).map((ev, idx) => {
                  const s = getEventStyle(ev.event_type ?? null);
                  return <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />;
                })}
              </div>
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

      <div style={{ flex: 1, overflowY: "auto" }}>
        {viewings.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--kk-ink-faint)" }}>No upcoming viewings</p>
            <Link href="/calendar" style={{ fontSize: 12, color: "var(--kk-blue)", textDecoration: "none", display: "block", marginTop: 6 }}>Schedule one →</Link>
          </div>
        ) : (
          viewings.map((ev, idx) => (
            <div key={ev.id} style={{ padding: "10px 14px", borderBottom: idx < viewings.length - 1 ? "1px solid var(--kk-line)" : "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", position: "relative" }}>
                {ev.cover_photo_url ? (
                  <Image src={ev.cover_photo_url} alt={ev.title} fill style={{ objectFit: "cover" }} sizes="56px" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 style={{ width: 20, height: 20, color: "var(--kk-ink-faint)" }} />
                  </div>
                )}
              </div>
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

// ── Recharts radial donut ──────────────────────────────────────────────────────

function FunnelDonut({ pct, color, bgColor, label }: { pct: number; color: string; bgColor: string; label: string }) {
  const sweep = Math.max(pct, 0.5) / 100 * 360;
  const endAngle = 90 - sweep;
  return (
    <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
      {/* Background track — full 360° */}
      <svg width={130} height={130} viewBox="0 0 130 130" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
        <circle cx={65} cy={65} r={48.5} fill="none" stroke={bgColor} strokeWidth={14} />
      </svg>
      {/* Colored arc */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <RadialBarChart width={130} height={130} data={[{ value: 1 }]} startAngle={90} endAngle={endAngle} innerRadius={42} outerRadius={56}>
          <RadialBar dataKey="value" fill={color} cornerRadius={7} isAnimationActive={true} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 9}
                        fill={color}
                        fontSize={20}
                        fontWeight={700}
                        fontFamily="inherit"
                      >
                        {pct}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 12}
                        fill={color}
                        fontSize={8}
                        fontWeight={600}
                        fontFamily="inherit"
                        opacity={0.7}
                      >
                        {label.toUpperCase()}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
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
        padding: "16px 14px 18px", cursor: "pointer", height: "100%", position: "relative",
      }}>
        {/* Top row: icon left, donut right */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon style={{ width: 26, height: 26, color: iconColor }} />
          </div>
          <FunnelDonut pct={donutPct} color={iconColor} bgColor={iconBg} label={donutLabel} />
        </div>

        {/* Count + label */}
        <p style={{ fontSize: 30, fontWeight: 700, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>
          {count.toLocaleString()}
        </p>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: iconColor, marginBottom: 10 }}>
          {label}
        </p>

        {/* Sub-stats */}
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
    </Link>
  );
}

// Export canvas helper (kept for PDF/image export feature)
async function buildExportCanvas(startMonth: string, gridEl: HTMLElement): Promise<HTMLCanvasElement> {
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
  ctx.fillText(`PROPERTY SNAPSHOT  ·  ${fmtMonthLabel(startMonth)}`, lx, logoBaseY + 28 * S);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillStyle = "rgba(29,29,31,0.38)";
  ctx.font = `${11 * S}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`Generated: ${date}`, W - 40 * S, logoBaseY);
  return canvas;
}

async function doExportPDF(startMonth: string, gridEl: HTMLElement) {
  const canvas = await buildExportCanvas(startMonth, gridEl);
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const { jsPDF } = await import("jspdf");
  const pdfW = 297;
  const pdfH = Math.round((canvas.height / canvas.width) * pdfW);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, pdfH] });
  doc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
  doc.save(`kakisewa-snapshot-${date.replace(/ /g, "-")}.pdf`);
}

async function doExportImage(startMonth: string, gridEl: HTMLElement) {
  const canvas = await buildExportCanvas(startMonth, gridEl);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const link = document.createElement("a");
  link.download = `kakisewa-snapshot-${date.replace(/ /g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Main section ───────────────────────────────────────────────────────────────

export function StatsSection({
  initialStats,
  monthEvents,
  currentMonth,
  mtdCommission,
  upcomingViewings,
  cardCount,
  cardCap,
  planName,
}: {
  initialStats: ExpandedDashboardStats;
  monthEvents: CalendarEvent[];
  currentMonth: string;
  mtdCommission: number;
  upcomingViewings: CalendarEvent[];
  cardCount: number;
  cardCap: number;
  planName: string;
}) {
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [calendarEvents, setCalendarEvents] = useState(monthEvents);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const viewingsToday = (monthEvents ?? []).filter(e => e.event_date === today && e.event_type === "viewing").length;
  const safeCardCount = cardCount ?? 0;
  const safeCardCap = cardCap ?? 400;
  const cardUsagePct = safeCardCap > 0 ? (safeCardCount / safeCardCap) * 100 : 0;
  const cardUsageColor = cardUsagePct >= 100 ? "var(--kk-red)" : cardUsagePct >= 80 ? "var(--kk-amber)" : "var(--kk-green)";
  const commFormatted = (mtdCommission ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function handleMonthChange(month: string) {
    setStartMonth(month);
    startTransition(async () => {
      const [fresh, freshCal] = await Promise.all([
        fetchExpandedStats(1, month),
        fetchCalendarMonth(month),
      ]);
      setStats(fresh);
      setCalendarEvents(freshCal);
    });
  }

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

      {/* Month picker */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <MonthPickerPill value={startMonth} onChange={handleMonthChange} />
      </div>

      {/* Monthly calendar + Upcoming Viewings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6" style={{ minHeight: 360 }}>
        <div className="lg:col-span-2">
          <MonthCalendar events={calendarEvents} yearMonth={startMonth} />
        </div>
        <div>
          <UpcomingViewings viewings={upcomingViewings} />
        </div>
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
