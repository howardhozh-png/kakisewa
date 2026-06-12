"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchExpandedStats } from "./actions";
import type { ExpandedDashboardStats } from "@/lib/db";

const RANGES = [
  { value: "0",  label: "Today" },
  { value: "3",  label: "3m" },
  { value: "6",  label: "6m" },
  { value: "12", label: "12m" },
  { value: "24", label: "24m" },
  { value: "36", label: "36m" },
] as const;

// 4 shades of --kk-accent, darkest → lightest
const SHADES = [
  "color-mix(in srgb, var(--kk-accent) 58%, #000)",
  "color-mix(in srgb, var(--kk-accent) 80%, #000)",
  "var(--kk-accent)",
  "color-mix(in srgb, var(--kk-accent) 68%, #fff)",
] as const;

function fmtRM(n: number): string | null {
  if (n <= 0) return null;
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(0)}k`;
  return `RM ${n.toLocaleString()}`;
}

interface StatDef {
  label: string;
  value: number;
  sub?: string | null;
}

function Quadrant({
  title,
  href,
  shade,
  stats,
}: {
  title: string;
  href: string;
  shade: string;
  stats: StatDef[];
}) {
  const cols = Math.min(stats.length, 2);
  return (
    <Link
      href={href}
      style={{ textDecoration: "none", color: "inherit" }}
      className="group flex flex-col overflow-hidden rounded-[20px] ring-1 ring-black/5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Coloured header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5"
        style={{ background: shade }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {title}
        </span>
        <ArrowUpRight
          className="w-[15px] h-[15px] shrink-0 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: "#fff" }}
        />
      </div>

      {/* Stat grid */}
      <div
        className="flex-1 p-5"
        style={{
          background: "var(--kk-surface)",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "0 16px",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{ borderTop: "1px solid var(--kk-line)", paddingTop: 12 }}
          >
            <p
              className="whitespace-nowrap"
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--kk-ink-faint)",
                marginBottom: 5,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                color: "var(--kk-ink)",
              }}
            >
              {s.value.toLocaleString()}
            </p>
            {s.sub && (
              <p style={{ fontSize: 11, marginTop: 4, color: "var(--kk-ink-mute)" }}>
                {s.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}

export function StatsSection({ initialStats }: { initialStats: ExpandedDashboardStats }) {
  const [range, setRange] = useState("0");
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  function handleRangeChange(val: string) {
    setRange(val);
    startTransition(async () => {
      const fresh = await fetchExpandedStats(parseInt(val, 10));
      setStats(fresh);
    });
  }

  const contactedPct =
    stats.totalUploaded > 0
      ? Math.round((stats.totalContacted / stats.totalUploaded) * 100)
      : 0;

  const periodLabel = range === "0" ? "60d" : `${range}m`;

  return (
    <div
      className="flex flex-col gap-4"
      style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s ease" }}
    >
      {/* Range filter */}
      <Tabs value={range} onValueChange={handleRangeChange}>
        <TabsList className="w-full">
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 4-quadrant grid: 1 col mobile, 2 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Quadrant
          title="Potential Pipeline"
          href="/potential-listing"
          shade={SHADES[0]}
          stats={[
            { label: "Total uploaded", value: stats.totalUploaded },
            {
              label: "Contacted",
              value: stats.totalContacted,
              sub: `${contactedPct}% of total`,
            },
          ]}
        />

        <Quadrant
          title="My Listing"
          href="/my-listing"
          shade={SHADES[1]}
          stats={[
            {
              label: "Listed for rent",
              value: stats.listedRentCount,
              sub: fmtRM(stats.listedRentAmount),
            },
            {
              label: "Listed for sale",
              value: stats.listedSaleCount,
              sub: fmtRM(stats.listedSaleAmount),
            },
            {
              label: "Replied (rent)",
              value: stats.repliedRentCount,
              sub: fmtRM(stats.repliedRentAmount),
            },
            {
              label: "Replied (sale)",
              value: stats.repliedSaleCount,
              sub: fmtRM(stats.repliedSaleAmount),
            },
          ]}
        />

        <Quadrant
          title="Existing Listing"
          href="/existing-listing"
          shade={SHADES[2]}
          stats={[
            {
              label: "Total active",
              value: stats.existingTotalActiveCount,
              sub: fmtRM(stats.existingTotalActiveAmount),
            },
            {
              label: `Expiring next ${periodLabel}`,
              value: stats.existingExpiringCount,
              sub: fmtRM(stats.existingExpiringAmount),
            },
          ]}
        />

        <Quadrant
          title="Target Listing"
          href="/target-listing"
          shade={SHADES[3]}
          stats={[
            {
              label: "Active targets",
              value: stats.targetTotalActiveCount,
              sub: fmtRM(stats.targetTotalActiveAmount),
            },
            {
              label: `Expiring next ${periodLabel}`,
              value: stats.targetExpiringCount,
              sub: fmtRM(stats.targetExpiringAmount),
            },
          ]}
        />
      </div>
    </div>
  );
}
