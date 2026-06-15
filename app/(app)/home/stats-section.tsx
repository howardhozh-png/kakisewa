"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
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

function buildExportCanvas(stats: ExpandedDashboardStats, startMonth: string, rangeKey: string): HTMLCanvasElement {
  // A4 landscape ratio: 297:210 × 7 = 2079:1470 — rounded to 2100×1485
  const W = 2100, H = 1485;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const contactedPct = stats.totalUploaded > 0 ? Math.round((stats.totalContacted / stats.totalUploaded) * 100) : 0;

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = "#FBFBFD";
  ctx.fillRect(0, 0, W, H);

  // ── Header (dark strip) ───────────────────────────────────────────────────
  ctx.fillStyle = "#1D1D1F";
  ctx.fillRect(0, 0, W, 178);

  // Logo: white rounded box with "k" inside
  const lx = 60, ly = 50, ls = 62, lr = 13;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, lx, ly, ls, ls, [lr, lr, lr, lr]);
  ctx.fillStyle = "#1D1D1F";
  ctx.font = "bold 38px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("k", lx + ls / 2, ly + 44);
  ctx.textAlign = "left";

  // Brand name
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 32px Arial, sans-serif";
  ctx.fillText("kakisewa", lx + ls + 16, ly + 42);

  // Subtitle row
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(`PROPERTY SNAPSHOT  ·  ${fmtMonthLabel(startMonth)}  ·  ${rangeKey} window`, lx, ly + ls + 24);

  // Generated date (right-aligned)
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "16px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Generated: ${date}`, W - 60, ly + 42);
  ctx.textAlign = "left";

  // ── Cards (2×2 grid) ──────────────────────────────────────────────────────
  const pad = 60, gap = 32;
  const cW = (W - pad * 2 - gap) / 2;
  const cTop = 210;
  const cH = (H - cTop - pad - gap) / 2;
  const banH = 76;

  const sections = [
    {
      title: "POTENTIAL LISTING", color: "#0052A5", bg: "#E6F0FF",
      primary: { num: stats.totalUploaded.toLocaleString(), label: "owner contacts imported" },
      stats: [
        { value: stats.totalContacted.toLocaleString(), label: "Contacted" },
        { value: `${contactedPct}%`, label: "% Contacted" },
      ],
    },
    {
      title: "MY LISTING", color: "#5B1E9C", bg: "#F2EBFF",
      primary: { num: stats.totalListedCount.toLocaleString(), label: "listings in progress" },
      stats: [
        { value: stats.listedRentCount.toLocaleString(), label: "Listed for rent" },
        { value: stats.listedSaleCount.toLocaleString(), label: "Listed for sale" },
      ],
    },
    {
      title: "EXISTING LISTING", color: "#166534", bg: "#E6FAEC",
      primary: { num: stats.existingTotalActiveCount.toLocaleString(), label: "active tenancies" },
      stats: [
        { value: stats.existingExpiringIn60Count.toLocaleString(), label: "Expiring in 60 days" },
        { value: stats.existingRenewingCount.toLocaleString(), label: "Renewing" },
        { value: stats.existingExpiredCount.toLocaleString(), label: "Expired" },
      ],
    },
    {
      title: "LOST LISTING", color: "#92400E", bg: "#FFF4E6",
      primary: { num: stats.targetTotalCount.toLocaleString(), label: "competitor properties tracked" },
      stats: [
        { value: stats.targetWatchingCount.toLocaleString(), label: "Watching" },
        { value: stats.targetExpiringIn60Count.toLocaleString(), label: "Expiring in 60 days" },
      ],
    },
  ];

  sections.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = pad + col * (cW + gap);
    const cy = cTop + row * (cH + gap);

    // Banner (top-rounded)
    ctx.fillStyle = s.color;
    roundRect(ctx, cx, cy, cW, banH, [22, 22, 0, 0]);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText(s.title, cx + 30, cy + banH / 2 + 9);

    // Body (bottom-rounded)
    ctx.fillStyle = s.bg;
    roundRect(ctx, cx, cy + banH, cW, cH - banH, [0, 0, 22, 22]);

    // Primary number
    ctx.fillStyle = s.color;
    ctx.font = "bold 108px Arial, sans-serif";
    ctx.fillText(s.primary.num, cx + 30, cy + banH + 118);

    // Primary label
    ctx.font = "26px Arial, sans-serif";
    ctx.globalAlpha = 0.58;
    ctx.fillText(s.primary.label, cx + 30, cy + banH + 162);
    ctx.globalAlpha = 1;

    // Divider
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = 0.10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy + banH + 194);
    ctx.lineTo(cx + cW - 30, cy + banH + 194);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Sub-stats (side by side)
    const nCols = s.stats.length;
    const sColW = (cW - 60) / nCols;
    s.stats.forEach((st, si) => {
      const sx = cx + 30 + si * sColW;
      ctx.fillStyle = s.color;
      ctx.font = "bold 54px Arial, sans-serif";
      ctx.fillText(st.value, sx, cy + banH + 262);
      ctx.font = "20px Arial, sans-serif";
      ctx.globalAlpha = 0.55;
      ctx.fillText(st.label, sx, cy + banH + 298);
      ctx.globalAlpha = 1;
    });
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.font = "15px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("kakisewa.com  ·  Confidential", W / 2, H - 20);
  ctx.textAlign = "left";

  return canvas;
}

async function doExportPDF(stats: ExpandedDashboardStats, startMonth: string, rangeKey: string) {
  const canvas = buildExportCanvas(stats, startMonth, rangeKey);
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  // A4 landscape: 297 × 210 mm
  doc.addImage(imgData, "JPEG", 0, 0, 297, 210);
  doc.save(`kakisewa-snapshot-${date.replace(/ /g, "-")}.pdf`);
}

function doExportImage(stats: ExpandedDashboardStats, startMonth: string, rangeKey: string) {
  const canvas = buildExportCanvas(stats, startMonth, rangeKey);
  const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  const link = document.createElement("a");
  link.download = `kakisewa-snapshot-${date.replace(/ /g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radii: [number, number, number, number]) {
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
  ctx.lineTo(x + radii[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
  ctx.lineTo(x, y + radii[0]);
  ctx.quadraticCurveTo(x, y, x + radii[0], y);
  ctx.closePath();
  ctx.fill();
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  async function handleExport(type: "pdf" | "image") {
    setExportOpen(false);
    setExporting(true);
    try {
      if (type === "pdf") {
        await doExportPDF(stats, startMonth, rangeKey);
      } else {
        doExportImage(stats, startMonth, rangeKey);
      }
    } finally {
      setExporting(false);
    }
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

        {/* Export button */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            disabled={exporting}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
              border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)",
              color: "var(--kk-ink)", cursor: "pointer", whiteSpace: "nowrap",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            <Download style={{ width: 11, height: 11 }} />
            {exporting ? "Exporting…" : "Export"}
          </button>
          {exportOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "var(--kk-surface)", border: "1px solid var(--kk-line)",
                borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                zIndex: 50, overflow: "hidden", minWidth: 130,
              }}
            >
              {(["pdf", "image"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleExport(type)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", fontSize: 13, fontWeight: 500,
                    color: "var(--kk-ink)", background: "none", border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kk-surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {type === "pdf" ? "Download PDF" : "Download Image"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 blocks — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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

      {/* Upcoming events strip */}
      {filteredEvents.length > 0 && (
        <div
          style={{
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--kk-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
              Upcoming — next 3 days
            </span>
            <Link
              href="/calendar"
              style={{ fontSize: 12, fontWeight: 500, color: "var(--kk-blue)", textDecoration: "none" }}
            >
              My Calendar →
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              padding: "14px 18px",
              gap: 10,
              WebkitOverflowScrolling: "touch",
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
        </div>
      )}
    </div>
  );
}
