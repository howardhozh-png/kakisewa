"use client";

import { useState, useMemo } from "react";
import { Tenancy, RentPayment, ActionStage, computeActionStage } from "@/lib/types";
import { KanbanBoard } from "@/components/kanban-board";

const SEGMENTS: { stage: ActionStage; label: string; dot: string; soft: string; ink: string }[] = [
  { stage: "owing",            label: "Owing",            dot: "var(--kk-red)",    soft: "var(--kk-red-soft)",    ink: "#C62828"        },
  { stage: "nearing",          label: "Due soon",         dot: "var(--kk-amber)",  soft: "var(--kk-amber-soft)",  ink: "#B45309"        },
  { stage: "pending_verify",   label: "Pending verify",   dot: "var(--kk-blue)",   soft: "var(--kk-blue-soft)",   ink: "var(--kk-blue)" },
  { stage: "awaiting_forward", label: "Awaiting forward", dot: "var(--kk-purple)", soft: "var(--kk-purple-soft)", ink: "#6F2DA8"        },
  { stage: "completed",        label: "Completed",        dot: "var(--kk-green)",  soft: "var(--kk-green-soft)",  ink: "#1F8B4C"        },
];

interface Props {
  tenancies: Tenancy[];
  paymentsByTenancy: Record<string, RentPayment[]>;
  baseUrl: string;
}

export function DashboardClient({ tenancies, paymentsByTenancy, baseUrl }: Props) {
  const [filterStage, setFilterStage] = useState<ActionStage | null>(null);
  const today = useMemo(() => new Date(), []);

  const counts = useMemo(() => {
    const map: Record<ActionStage, number> = {
      owing: 0, nearing: 0, pending_verify: 0, awaiting_forward: 0, completed: 0,
    };
    tenancies.forEach((t) => { map[computeActionStage(t, today)]++; });
    return map;
  }, [tenancies, today]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="kk-h2" style={{ color: "var(--kk-ink)" }}>Action board</h2>
        <p className="kk-caption">Click any card for detail · drag a card to advance the stage</p>
      </div>

      {/* Filter strip */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill
          dot="var(--kk-ink-faint)"
          label="All"
          count={tenancies.length}
          active={filterStage === null}
          onClick={() => setFilterStage(null)}
        />
        {SEGMENTS.map((s) => (
          <FilterPill
            key={s.stage}
            dot={s.dot}
            label={s.label}
            count={counts[s.stage]}
            soft={s.soft}
            ink={s.ink}
            active={filterStage === s.stage}
            onClick={() => setFilterStage(filterStage === s.stage ? null : s.stage)}
          />
        ))}
      </div>

      <KanbanBoard
        tenancies={tenancies}
        baseUrl={baseUrl}
        paymentsByTenancy={paymentsByTenancy}
        filterStage={filterStage}
        onClearFilter={() => setFilterStage(null)}
      />
    </section>
  );
}

function FilterPill({
  dot, label, count, soft, ink, active, onClick,
}: {
  dot: string; label: string; count: number;
  soft?: string; ink?: string; active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[13px] font-medium"
      style={{
        background: active ? (soft ?? "var(--kk-ink)") : "var(--kk-surface-2)",
        color: active ? (ink ?? "#fff") : "var(--kk-ink-soft)",
        border: `1px solid ${active && soft ? (ink ?? "transparent") : "transparent"}`,
        boxShadow: active && !soft ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      <span>{label}</span>
      <span className="tabular-nums" style={{ color: active ? (ink ?? "#fff") : "var(--kk-ink-faint)" }}>
        {count}
      </span>
    </button>
  );
}
