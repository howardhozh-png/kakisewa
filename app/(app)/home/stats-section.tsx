"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
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

function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtEventDate(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${y}`;
}

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
  color,
}: {
  overline: string;
  primaryNum: number;
  primaryLabel: string;
  stats: BlockStat[];
  href: string;
  bg: string;
  color: string;
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
        minHeight: 210,
        cursor: "pointer",
        transition: "transform 0.18s cubic-bezier(.32,.72,0,1), box-shadow 0.18s",
      }}
    >
      {/* Header banner */}
      <div style={{
        background: color,
        padding: "13px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.88)", margin: 0 }}>
          {overline}
        </p>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1 }}>↗</span>
      </div>

      {/* Body */}
      <div style={{ background: bg, color, padding: "20px 24px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {primaryNum.toLocaleString()}
        </p>
        <p style={{ fontSize: 13, fontWeight: 500, opacity: 0.6, marginTop: 4, marginBottom: 18 }}>
          {primaryLabel}
        </p>
        <div style={{ height: 1, background: "currentColor", opacity: 0.10, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, opacity: 0.55, marginTop: 3 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

async function buildExportCanvas(startMonth: string, rangeKey: string, gridEl: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;

  // Snapshot the live rendered cards at 2x for crisp output
  const S = 2;
  const cardsCanvas = await html2canvas(gridEl, {
    scale: S,
    backgroundColor: "#FBFBFD",
    useCORS: true,
    logging: false,
  });

  const W = cardsCanvas.width;
  const headerH = 88 * S;   // 88px logical → 176px canvas pixels
  const sepH = 1;
  const footerH = 26 * S;
  const H = headerH + sepH + cardsCanvas.height + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#FBFBFD";
  ctx.fillRect(0, 0, W, H);

  // Separator line between header and cards
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.fillRect(0, headerH, W, sepH);

  // Cards snapshot
  ctx.drawImage(cardsCanvas, 0, headerH + sepH);

  // Footer
  ctx.fillStyle = "rgba(29,29,31,0.20)";
  ctx.font = `${11 * S}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("kakisewa.com  ·  Confidential", W / 2, headerH + sepH + cardsCanvas.height + footerH - 8 * S);

  // ── Header logo ───────────────────────────────────────────────────────────
  const lx = 40 * S;
  const logoBaseY = Math.round(headerH * 0.52);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // "k" in bold serif
  ctx.fillStyle = "#1D1D1F";
  ctx.font = `bold ${30 * S}px Georgia, 'DM Serif Display', serif`;
  const kW = ctx.measureText("k").width;
  ctx.fillText("k", lx, logoBaseY);

  // "kakisewa" at same baseline
  ctx.font = `${24 * S}px Georgia, 'DM Serif Display', serif`;
  ctx.fillText("kakisewa", lx + kW + 8 * S, logoBaseY);

  // "カキセワ" spaced out below kakisewa, muted
  ctx.fillStyle = "rgba(29,29,31,0.42)";
  ctx.font = `600 ${8 * S}px 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif`;
  "カキセワ".split("").forEach((c, i) => {
    ctx.fillText(c, lx + kW + 8 * S + i * 11 * S, logoBaseY + 14 * S);
  });

  // Snapshot period label
  ctx.fillStyle = "rgba(29,29,31,0.30)";
  ctx.font = `${9 * S}px Arial, sans-serif`;
  ctx.fillText(
    `PROPERTY SNAPSHOT  ·  ${fmtMonthLabel(startMonth)}  ·  ${rangeKey} window`,
    lx,
    logoBaseY + 28 * S,
  );

  // Generated date (right)
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillStyle = "rgba(29,29,31,0.38)";
  ctx.font = `${11 * S}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`Generated: ${date}`, W - 40 * S, logoBaseY);
  ctx.textAlign = "left";

  return canvas;
}

async function doExportPDF(startMonth: string, rangeKey: string, gridEl: HTMLElement) {
  const canvas = await buildExportCanvas(startMonth, rangeKey, gridEl);
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const { jsPDF } = await import("jspdf");
  // Fit to A4 landscape; derive height from canvas aspect ratio
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

export function StatsSection({
  initialStats,
  upcomingEvents,
}: {
  initialStats: ExpandedDashboardStats;
  upcomingEvents: CalendarEvent[];
}) {
  const todayMonthValue = new Date().toISOString().slice(0, 7);
  const [startMonth, setStartMonth] = useState(todayMonthValue);
  const [rangeKey, setRangeKey] = useState<string>("3m");
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  const calScrollRef = useRef<HTMLDivElement>(null);
  const [calThumb, setCalThumb] = useState({ left: 0, width: 0 });

  const updateCalThumb = useCallback(() => {
    const el = calScrollRef.current;
    if (!el) return;
    const track = el.clientWidth;
    const content = el.scrollWidth;
    if (content <= track) { setCalThumb({ left: 0, width: 0 }); return; }
    const thumbW = Math.max(36, (track / content) * track);
    const thumbL = (el.scrollLeft / (content - track)) * (track - thumbW);
    setCalThumb({ left: thumbL, width: thumbW });
  }, []);

  useEffect(() => {
    updateCalThumb();
    window.addEventListener("resize", updateCalThumb);
    return () => window.removeEventListener("resize", updateCalThumb);
  }, [updateCalThumb]);

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

  const contactedPct =
    stats.totalUploaded > 0
      ? Math.round((stats.totalContacted / stats.totalUploaded) * 100)
      : 0;

  const totalMyListings = stats.totalListedCount;

  const today = new Date().toISOString().slice(0, 10);
  const threeDaysOut = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const filteredEvents = upcomingEvents.filter(
    (e) => e.event_date >= today && e.event_date <= threeDaysOut
  );

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s ease" }}>
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

      {/* Upcoming events strip */}
      {filteredEvents.length > 0 && (
        <Link
          href="/calendar"
          className="group hover:-translate-y-1 hover:shadow-lg"
          style={{
            display: "block",
            textDecoration: "none",
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)",
            cursor: "pointer",
            transition: "transform 0.18s cubic-bezier(.32,.72,0,1), box-shadow 0.18s",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--kk-line)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
              Upcoming — next 3 days
            </span>
          </div>
          <div
            ref={calScrollRef}
            className="kk-cal-scroll"
            onScroll={updateCalThumb}
            style={{
              display: "flex",
              overflowX: "auto",
              padding: "14px 18px 12px",
              gap: 10,
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {filteredEvents.map((ev) => {
              const isToday = ev.event_date === today;
              return (
                <div
                  key={ev.id}
                  style={{
                    flexShrink: 0,
                    background: isToday ? "rgba(0,113,227,0.09)" : "#F5F5F7",
                    borderRadius: 14,
                    padding: "12px 14px",
                    minWidth: 170,
                    maxWidth: 200,
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: isToday ? "var(--kk-blue)" : "var(--kk-ink-faint)",
                      marginBottom: 6,
                    }}
                  >
                    {fmtEventDate(ev.event_date, today)}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.3 }}>
                    {ev.title}
                  </p>
                  {ev.subtitle && (
                    <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", marginTop: 3 }}>
                      {ev.subtitle}
                    </p>
                  )}
                  {ev.event_time && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-blue)", marginTop: 6 }}>
                      {fmtTime(ev.event_time)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Custom always-visible scroll indicator */}
          {calThumb.width > 0 && (
            <div style={{ margin: "0 18px 14px", height: 4, borderRadius: 2, background: "var(--kk-surface-2)", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: calThumb.left, width: calThumb.width, height: 4, borderRadius: 2, background: "var(--kk-ink-faint)" }} />
            </div>
          )}
        </Link>
      )}

      {/* 4 blocks — 1 col mobile, 2 col sm+ */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Block
          overline="Potential listing"
          primaryNum={stats.totalUploaded}
          primaryLabel="owner contacts imported"
          stats={[
            { label: "Contacted", value: stats.totalContacted },
            { label: "% Contacted", value: `${contactedPct}%` },
          ]}
          href="/potential-listing"
          bg="rgba(0,113,227,0.09)"
          color="#0052A5"
        />

        <Block
          overline="My listing"
          primaryNum={totalMyListings}
          primaryLabel="listings in progress"
          stats={[
            { label: "Listed for rent", value: stats.listedRentCount },
            { label: "Listed for sale", value: stats.listedSaleCount },
          ]}
          href="/my-listing"
          bg="rgba(175,82,222,0.09)"
          color="#5B1E9C"
        />

        <Block
          overline="Existing listing"
          primaryNum={stats.existingTotalActiveCount}
          primaryLabel="active tenancies"
          stats={[
            { label: "Expiring in 60 days", value: stats.existingExpiringIn60Count },
            { label: "Renewing", value: stats.existingRenewingCount },
            { label: "Expired", value: stats.existingExpiredCount },
          ]}
          href="/existing-listing"
          bg="rgba(52,199,89,0.11)"
          color="#166534"
        />

        <Block
          overline="Lost listing"
          primaryNum={stats.targetTotalCount}
          primaryLabel="competitor properties tracked"
          stats={[
            { label: "Watching", value: stats.targetWatchingCount },
            { label: "Expiring in 60 days", value: stats.targetExpiringIn60Count },
          ]}
          href="/lost-listing"
          bg="rgba(255,149,0,0.11)"
          color="#92400E"
        />
      </div>

    </div>
  );
}
