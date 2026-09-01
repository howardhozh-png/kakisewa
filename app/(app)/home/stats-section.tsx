"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { RadialBarChart, RadialBar, PolarRadiusAxis, Label } from "recharts";
import type { ExpandedDashboardStats, CalendarEvent } from "@/lib/db";
import { Layers, Banknote, CalendarDays, Building2, TrendingUp } from "lucide-react";

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
  progressLabel,
  href,
  sparkline,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  subLabel?: string;
  progress?: number;
  progressColor?: string;
  progressLabel?: string;
  href: string;
  sparkline?: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div className="kk-metric-card-inner" style={{
        background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 16,
        cursor: "pointer", height: "100%", position: "relative", overflow: "hidden",
      }}>
        {sparkline && (
          <div style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
            {sparkline}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="kk-metric-card-icon-wrap" style={{ background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon className="kk-metric-card-icon-svg" style={{ color: iconColor }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", marginBottom: 3 }}>
              {label}
            </p>
            <p className="kk-metric-card-value">
              {value}
              {subValue && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--kk-ink-mute)" }}>{" "}/{" "}{subValue}</span>}
            </p>
            {subLabel && (
              <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginTop: 2 }}>{subLabel}</p>
            )}
          </div>
        </div>
        {progress !== undefined && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 7, background: "var(--kk-line)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: progressColor ?? "var(--kk-blue)", borderRadius: 4, transition: "width 0.3s ease" }} />
            </div>
            <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", marginTop: 5 }}>
              {progressLabel ?? `${Math.round(progress)}% completed`}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Week calendar — shows Mon–Sun of the current week ─────────────────────────

function WeekCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [ty, tm, td] = today.split("-").map(Number);

  const todayDate = new Date(ty, tm - 1, td);
  const dow = (todayDate.getDay() + 6) % 7; // 0=Mon
  const weekDays: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ty, tm - 1, td - dow + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });

  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!byDate[ev.event_date]) byDate[ev.event_date] = [];
    byDate[ev.event_date].push(ev);
  }

  return (
    <div style={{
      background: "var(--kk-surface)",
      border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden",
      boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)", height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)" }}>Event Calendar</span>
        <Link href="/calendar" style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)", flexShrink: 0, textDecoration: "none" }}>View full calendar →</Link>
      </div>

      {/* Desktop: 7-column grid with detailed event cards */}
      <div className="hidden lg:flex" style={{ flexDirection: "column", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--kk-line)", flexShrink: 0 }}>
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ padding: "7px 0", textAlign: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--kk-ink-faint)" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, minHeight: 180, overflow: "hidden" }}>
          {weekDays.map((dateStr, i) => {
            const isToday = dateStr === today;
            const dayNum = parseInt(dateStr.split("-")[2]);
            const dayEvents = byDate[dateStr] ?? [];

            return (
              <div key={dateStr} style={{
                borderRight: i < 6 ? "1px solid var(--kk-line)" : "none",
                padding: "8px 6px", overflow: "hidden",
                background: isToday ? "rgba(0,113,227,0.04)" : "transparent",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 7, flexShrink: 0 }}>
                  {isToday ? (
                    <span style={{ width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--kk-blue)", color: "#fff", borderRadius: "50%", fontSize: 12, fontWeight: 700 }}>
                      {dayNum}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)" }}>{dayNum}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                  {dayEvents.map((ev) => {
                    const s = getEventStyle(ev.event_type ?? null);
                    return (
                      <Link key={ev.id} href="/calendar" style={{ textDecoration: "none" }}>
                        <div style={{ background: s.bg, borderRadius: 7, padding: "5px 6px" }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: s.color, lineHeight: 1.2, marginBottom: 1 }}>
                            {fmtTime(ev.event_time) ?? "All day"}
                          </p>
                          <p style={{ fontSize: 10, fontWeight: 600, color: s.color, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p style={{ fontSize: 9, color: s.color, opacity: 0.7, lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ev.subtitle}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: agenda-style list with full event cards */}
      <div className="lg:hidden" style={{ flex: 1, overflowY: "auto", minHeight: 280 }}>
        {weekDays.map((dateStr, i) => {
          const isToday = dateStr === today;
          const dayNum = parseInt(dateStr.split("-")[2]);
          const dayLabel = DAY_LABELS[i];
          const dayEvents = byDate[dateStr] ?? [];

          return (
            <div key={dateStr} style={{
              borderBottom: i < 6 ? "1px solid var(--kk-line)" : "none",
              padding: "10px 14px",
              background: isToday ? "rgba(0,113,227,0.03)" : "transparent",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", width: 36 }}>
                  {isToday ? (
                    <span style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--kk-blue)", color: "#fff", borderRadius: "50%", fontSize: 13, fontWeight: 700 }}>
                      {dayNum}
                    </span>
                  ) : (
                    <span style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
                      {dayNum}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isToday ? "var(--kk-blue)" : "var(--kk-ink-faint)", marginTop: 2 }}>{dayLabel}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {dayEvents.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {dayEvents.map((ev) => {
                        const s = getEventStyle(ev.event_type ?? null);
                        return (
                          <Link key={ev.id} href="/calendar" style={{ textDecoration: "none" }}>
                            <div style={{ background: s.bg, borderRadius: 9, padding: "7px 10px" }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 2 }}>
                                {fmtTime(ev.event_time) ?? "All day"}
                              </p>
                              <p style={{ fontSize: 13, fontWeight: 600, color: s.color, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.title}
                              </p>
                              {ev.subtitle && (
                                <p style={{ fontSize: 11, color: s.color, opacity: 0.7, lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {ev.subtitle}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--kk-ink-faint)", paddingTop: 6 }}>No events</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Upcoming Viewings ──────────────────────────────────────────────────────────

function UpcomingViewings({ viewings }: { viewings: CalendarEvent[] }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const shown = viewings.slice(0, 5);

  return (
    <div style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 18, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)" }}>Upcoming Viewings</span>
          {viewings.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(0,113,227,0.10)", color: "#0071E3", borderRadius: 8, padding: "2px 7px" }}>
              {viewings.length}
            </span>
          )}
        </div>
        <Link href="/calendar" style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)", textDecoration: "none" }}>All →</Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {shown.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--kk-ink-faint)" }}>No upcoming viewings</p>
            <Link href="/calendar" style={{ fontSize: 12, color: "var(--kk-blue)", textDecoration: "none", display: "block", marginTop: 6 }}>Schedule one →</Link>
          </div>
        ) : (
          shown.map((ev, idx) => (
            <div key={ev.id} style={{ padding: "10px 14px", borderBottom: idx < shown.length - 1 ? "1px solid var(--kk-line)" : "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
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

// ── Recharts radial donut — shadcn style, count+label+pct inside ──────────────

function FunnelDonut({ pct, color, count, countLabel, arcLabel, size = 160 }: {
  pct: number; color: string; count: number; countLabel: string; arcLabel: string; size?: number;
}) {
  const sweep = Math.max(pct, 0.5) / 100 * 360;
  const endAngle = 90 - sweep;
  const r = size / 2;
  const innerR = Math.round(r * 0.68);
  const outerR = Math.round(r * 0.88);
  const trackR = (innerR + outerR) / 2;
  const trackSW = outerR - innerR;

  const numStr = count.toLocaleString();
  const numFontSize = numStr.length <= 2 ? 30 : numStr.length <= 3 ? 24 : numStr.length <= 5 ? 19 : 16;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
        <circle cx={r} cy={r} r={trackR} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={trackSW} />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <RadialBarChart width={size} height={size} data={[{ value: 1 }]} startAngle={90} endAngle={endAngle} innerRadius={innerR} outerRadius={outerR}>
          <RadialBar dataKey="value" fill={color} cornerRadius={8} isAnimationActive={true} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  const cx = viewBox.cx || 0;
                  const cy = viewBox.cy || 0;
                  return (
                    <text textAnchor="middle">
                      {/* Count — big */}
                      <tspan x={cx} y={cy - 12} fill="#1D1D1F" fontSize={numFontSize} fontWeight={700} fontFamily="inherit">
                        {numStr}
                      </tspan>
                      {/* countLabel — what the number is */}
                      <tspan x={cx} y={cy + 6} fill="#6E6E73" fontSize={9} fontFamily="inherit">
                        {countLabel}
                      </tspan>
                      {/* pct% arcLabel — what the arc means */}
                      <tspan x={cx} y={cy + 19} fill={color} fontSize={9} fontWeight={600} fontFamily="inherit">
                        {pct}% {arcLabel}
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

// ── Pipeline funnel panel — single white card above calendar ───────────────────

interface FunnelStat { label: string; value: number | string }

function FunnelItem({
  title, href, count, countLabel, arcLabel, color,
  donutPct, stats,
}: {
  title: string; href: string; count: number; countLabel: string; arcLabel: string;
  color: string; donutPct: number;
  stats: FunnelStat[];
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 8px" }}>
      {/* Segment title — colored, title case */}
      <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 14 }}>
        {title}
      </p>
      {/* Donut with count + arcLabel inside */}
      <FunnelDonut pct={donutPct} color={color} count={count} countLabel={countLabel} arcLabel={arcLabel} size={160} />
      {/* Sub-stats as pill boxes */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "var(--kk-surface)", border: "1px solid var(--kk-line)",
            borderRadius: 8, padding: "5px 10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", fontVariantNumeric: "tabular-nums" }}>
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </span>
            <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Arrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 32, color: "var(--kk-ink-faint)", fontSize: 18, paddingBottom: 8 }}>
      →
    </div>
  );
}

function Divider() {
  return (
    <div style={{ width: 1, background: "var(--kk-line)", margin: "0 8px", alignSelf: "stretch", flexShrink: 0 }} />
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
  closedThisMonth,
  upcomingViewings,
  cardCount,
  cardCap,
  planName,
}: {
  initialStats: ExpandedDashboardStats;
  monthEvents: CalendarEvent[];
  currentMonth: string;
  mtdCommission: number;
  closedThisMonth: number;
  upcomingViewings: CalendarEvent[];
  cardCount: number;
  cardCap: number;
  planName: string;
}) {
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [calendarEvents, setCalendarEvents] = useState(monthEvents);
  const [stats, setStats] = useState(initialStats);

  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const viewingsToday = (monthEvents ?? []).filter(e => e.event_date === today && e.event_type === "viewing").length;
  const safeCardCount = cardCount ?? 0;
  const safeCardCap = cardCap ?? 400;
  const cardUsagePct = safeCardCap > 0 ? (safeCardCount / safeCardCap) * 100 : 0;
  const cardUsageColor = cardUsagePct >= 100 ? "var(--kk-red)" : cardUsagePct >= 80 ? "var(--kk-amber)" : "var(--kk-green)";
  const commFormatted = (mtdCommission ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const contactedPct = stats.totalUploaded > 0 ? Math.round((stats.totalContacted / stats.totalUploaded) * 100) : 0;
  const myAvailPct = stats.existingTotalActiveCount > 0 ? Math.round((stats.existingExpiringCount / stats.existingTotalActiveCount) * 100) : 0;
  const existingTotal = stats.existingTotalActiveCount + stats.existingExpiredCount;
  const existingAtRiskPct = existingTotal > 0 ? Math.round(((stats.existingExpiringIn60Count + stats.existingExpiredCount) / existingTotal) * 100) : 0;
  const targetAtRiskPct = stats.targetTotalCount > 0 ? Math.round((stats.targetExpiringIn60Count / stats.targetTotalCount) * 100) : 0;

  void doExportPDF; void doExportImage;

  return (
    <div>

      {/* Pipeline funnel panel */}
      <div ref={gridRef} className="mb-6">
        {/* Desktop: single white card */}
        <div className="hidden lg:block" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 18, padding: "20px 24px 24px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)", marginBottom: 20 }}>Pipeline Overview</p>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <FunnelItem
              title="Property Leads" href="/property-leads"
              count={stats.totalUploaded ?? 0} countLabel="leads" arcLabel="contacted" color="#0071E3"
              donutPct={contactedPct}
              stats={[{ label: "Contacted", value: stats.totalContacted ?? 0 }, { label: "Not contacted", value: (stats.totalUploaded ?? 0) - (stats.totalContacted ?? 0) }]}
            />
            <Arrow />
            <FunnelItem
              title="My Listing" href="/my-listing"
              count={stats.totalListedCount ?? 0} countLabel="listings" arcLabel="available" color="#6F2DA8"
              donutPct={myAvailPct}
              stats={[{ label: "For rent", value: stats.listedRentCount ?? 0 }, { label: "For sale", value: stats.listedSaleCount ?? 0 }]}
            />
            <Arrow />
            <FunnelItem
              title="Existing Listing" href="/existing-listing"
              count={(stats.existingTotalActiveCount ?? 0) + (stats.existingExpiredCount ?? 0)} countLabel="contracts" arcLabel="expired/expiring" color="#1F8B4C"
              donutPct={existingAtRiskPct}
              stats={[{ label: "Expired", value: stats.existingExpiredCount ?? 0 }, { label: "Expiring 60d", value: stats.existingExpiringIn60Count ?? 0 }, { label: "Renewing", value: stats.existingRenewingCount ?? 0 }]}
            />
            <Divider />
            <FunnelItem
              title="Lost Listing" href="/lost-listing"
              count={stats.targetTotalCount ?? 0} countLabel="watching" arcLabel="expiring" color="#B45309"
              donutPct={targetAtRiskPct}
              stats={[{ label: "Expiring 60d", value: stats.targetExpiringIn60Count ?? 0 }, { label: "Watching", value: stats.targetWatchingCount ?? 0 }]}
            />
          </div>
        </div>

        {/* Mobile: section title + 2x2 grid */}
        <div className="lg:hidden">
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)", marginBottom: 12 }}>Pipeline Overview</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Property Leads", href: "/property-leads", count: stats.totalUploaded ?? 0, countLabel: "leads", arcLabel: "contacted", color: "#0071E3", donutPct: contactedPct, stats: [{ label: "Contacted", value: stats.totalContacted ?? 0 }, { label: "Not yet", value: (stats.totalUploaded ?? 0) - (stats.totalContacted ?? 0) }] },
              { title: "My Listing", href: "/my-listing", count: stats.totalListedCount ?? 0, countLabel: "listings", arcLabel: "available", color: "#6F2DA8", donutPct: myAvailPct, stats: [{ label: "For rent", value: stats.listedRentCount ?? 0 }, { label: "For sale", value: stats.listedSaleCount ?? 0 }] },
              { title: "Existing Listing", href: "/existing-listing", count: (stats.existingTotalActiveCount ?? 0) + (stats.existingExpiredCount ?? 0), countLabel: "contracts", arcLabel: "expired/expiring", color: "#1F8B4C", donutPct: existingAtRiskPct, stats: [{ label: "Expired", value: stats.existingExpiredCount ?? 0 }, { label: "Expiring 60d", value: stats.existingExpiringIn60Count ?? 0 }] },
              { title: "Lost Listing", href: "/lost-listing", count: stats.targetTotalCount ?? 0, countLabel: "watching", arcLabel: "expiring", color: "#B45309", donutPct: targetAtRiskPct, stats: [{ label: "Expiring 60d", value: stats.targetExpiringIn60Count ?? 0 }, { label: "Watching", value: stats.targetWatchingCount ?? 0 }] },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 16, padding: "16px 12px 18px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: item.color, marginBottom: 10 }}>{item.title}</p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <FunnelDonut pct={item.donutPct} color={item.color} count={item.count} countLabel={item.countLabel} arcLabel={item.arcLabel} size={128} />
                  </div>
                  <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", marginTop: "auto" }}>
                    {item.stats.map((s) => (
                      <div key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 7, padding: "4px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", fontVariantNumeric: "tabular-nums" }}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</span>
                        <span style={{ fontSize: 10, color: "var(--kk-ink-mute)" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Metric row — 4 white cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={Layers}
          iconBg="rgba(0,113,227,0.10)"
          iconColor="#004FAD"
          label="Card Usage"
          value={safeCardCount.toLocaleString()}
          subValue={safeCardCap.toLocaleString()}
          subLabel={(planName ?? "") + " plan"}
          progress={cardUsagePct}
          progressColor="#004FAD"
          progressLabel={`${Math.round(cardUsagePct)}% used`}
          href="/subscription"
        />
        <MetricCard
          icon={Banknote}
          iconBg="rgba(52,199,89,0.12)"
          iconColor="#1F8B4C"
          label="Commission This Month"
          value={"RM " + commFormatted}
          subLabel="earned this month"
          href="/performance"
          sparkline={<CommissionSparkline />}
        />
        <MetricCard
          icon={CalendarDays}
          iconBg="rgba(0,113,227,0.10)"
          iconColor="#004FAD"
          label="Viewings Today"
          value={String(viewingsToday)}
          subValue="3"
          subLabel="daily goal"
          progress={(viewingsToday / 3) * 100}
          progressColor="#004FAD"
          href="/calendar"
        />
        <MetricCard
          icon={TrendingUp}
          iconBg="rgba(52,199,89,0.12)"
          iconColor="#145E33"
          label="Closed Deal This Month"
          value={String(closedThisMonth ?? 0)}
          subLabel="deals closed"
          href="/performance"
        />
      </div>

      {/* Week calendar — full width */}
      <WeekCalendar events={calendarEvents} />
    </div>
  );
}
