"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function fmtRM(n: number) {
  if (n === 0) return null;
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(0)}k`;
  return `RM ${n.toLocaleString()}`;
}

function StatCell({
  label,
  count,
  amount,
  sub,
  badge,
}: {
  label: string;
  count: number;
  amount?: number;
  sub?: string;
  badge?: string;
}) {
  const amountStr = amount !== undefined ? fmtRM(amount) : null;
  return (
    <div className="flex flex-col gap-1 py-3" style={{ borderTop: "1px solid var(--kk-line)" }}>
      <p
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span
          className="text-[28px] font-bold tabular-nums leading-none"
          style={{ color: "var(--kk-ink)" }}
        >
          {count}
        </span>
        {badge && (
          <Badge variant="secondary" className="text-[10px]">
            {badge}
          </Badge>
        )}
      </div>
      {amountStr && (
        <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          {amountStr}/mo
        </p>
      )}
      {sub && (
        <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <CardTitle
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export function StatsSection({ initialStats }: { initialStats: ExpandedDashboardStats }) {
  const [range, setRange] = useState<string>("0");
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
      style={{ opacity: isPending ? 0.55 : 1, transition: "opacity 0.15s ease" }}
    >
      {/* Time range filter */}
      <Tabs value={range} onValueChange={handleRangeChange}>
        <TabsList className="w-full">
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Potential Pipeline */}
      <SectionCard title="Potential Pipeline">
        <StatCell
          label="Total uploaded"
          count={stats.totalUploaded}
        />
        <StatCell
          label="Contacted"
          count={stats.totalContacted}
          sub={`${contactedPct}% of total`}
        />
      </SectionCard>

      {/* My Listing */}
      <SectionCard title="My Listing">
        <StatCell
          label="Listed for rent"
          count={stats.listedRentCount}
          amount={stats.listedRentAmount}
        />
        <StatCell
          label="Listed for sale"
          count={stats.listedSaleCount}
          amount={stats.listedSaleAmount}
        />
        <StatCell
          label="Owner replied (rent)"
          count={stats.repliedRentCount}
          amount={stats.repliedRentAmount}
        />
        <StatCell
          label="Owner replied (sale)"
          count={stats.repliedSaleCount}
          amount={stats.repliedSaleAmount}
        />
      </SectionCard>

      {/* Existing Listing */}
      <SectionCard title="Existing Listing">
        <StatCell
          label="Total active"
          count={stats.existingTotalActiveCount}
          amount={stats.existingTotalActiveAmount}
        />
        <StatCell
          label={`Expiring next ${periodLabel}`}
          count={stats.existingExpiringCount}
          amount={stats.existingExpiringAmount}
        />
      </SectionCard>

      {/* Target Listing */}
      <SectionCard title="Target Listing">
        <StatCell
          label="Active targets"
          count={stats.targetTotalActiveCount}
          amount={stats.targetTotalActiveAmount}
        />
        <StatCell
          label={`Expiring next ${periodLabel}`}
          count={stats.targetExpiringCount}
          amount={stats.targetExpiringAmount}
        />
      </SectionCard>
    </div>
  );
}
