"use client";

import { useState, useTransition } from "react";
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
        color,
        background: bg,
        borderRadius: 22,
        padding: "26px 24px 22px",
        display: "flex",
        flexDirection: "column",
        minHeight: 210,
        cursor: "pointer",
        transition: "transform 0.18s cubic-bezier(.32,.72,0,1), box-shadow 0.18s",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", opacity: 0.55, marginBottom: 14 }}>
        {overline}
      </p>
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
      <div style={{ flex: 1 }} />
      <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, marginTop: 16, alignSelf: "flex-end" }}>
        View →
      </p>
    </Link>
  );
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

  function handleRangeChange(key: string) {
    setRangeKey(key);
    refetch(getRangeMonths(key), startMonth);
  }

  const respondedPct =
    stats.totalUploaded > 0
      ? Math.round((stats.totalResponded / stats.totalUploaded) * 100)
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
            className="text-[12px] font-medium gap-1 [&_svg]:size-3"
            style={{ height: "auto", padding: "6px 10px", borderRadius: 12, border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
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

      {/* 4 blocks — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Block
          overline="Potential listing"
          primaryNum={stats.totalUploaded}
          primaryLabel="owner contacts imported"
          stats={[
            { label: "Contacted", value: stats.totalContacted },
            { label: "Responded / Listed", value: `${respondedPct}%` },
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
