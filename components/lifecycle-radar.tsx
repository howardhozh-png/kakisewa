"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tenancy } from "@/lib/types";
import { Clock } from "lucide-react";
import { FilterSelect } from "@/components/filter-select";

type Window = 30 | 60 | 90;
type Sort = "date" | "rent_desc" | "rent_asc";

interface Props {
  tenancies: Tenancy[];
  renewalCommissionPct?: number;
}

export function LifecycleRadar({ tenancies, renewalCommissionPct = 50 }: Props) {
  const router = useRouter();
  const [windowDays, setWindowDays] = useState<Window>(60);
  const [sort, setSort]             = useState<Sort>("date");

  const today = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    return tenancies
      .filter((t) => {
        if (!t.contract_end) return false;
        const days = Math.round((new Date(t.contract_end).getTime() - today.getTime()) / 86400000);
        if (days < 0 || days > windowDays) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "date") {
          return (a.contract_end ?? "").localeCompare(b.contract_end ?? "");
        }
        if (sort === "rent_desc") return (b.amount ?? 0) - (a.amount ?? 0);
        return (a.amount ?? 0) - (b.amount ?? 0);
      });
  }, [tenancies, windowDays, sort, today]);

  return (
    <section className="kk-section p-6 lg:p-8">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="kk-section-title mb-1" style={{ color: "var(--kk-ink)" }}>Lifecycle Radar</p>
          <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>expiring soon</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="kk-scale-hover flex rounded-full overflow-hidden" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)" }}>
            {([30, 60, 90] as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindowDays(w)}
                className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: windowDays === w ? "var(--kk-ink)" : "transparent",
                  color:      windowDays === w ? "#fff" : "var(--kk-ink-mute)",
                }}
              >
                {w}d
              </button>
            ))}
          </div>
          <FilterSelect
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={[
              { value: "date",      label: "Date" },
              { value: "rent_desc", label: "Rent: high → low" },
              { value: "rent_asc",  label: "Rent: low → high" },
            ]}
            minWidth={160}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="kk-body-sm py-6 text-center" style={{ color: "var(--kk-ink-mute)" }}>
          No contracts expiring within {windowDays} days.
        </p>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: 520, padding: "8px", margin: "-8px" }}>
          <ul className="space-y-2">
            {filtered.map((t) => {
              const days = t.contract_end ? Math.round((new Date(t.contract_end).getTime() - today.getTime()) / 86400000) : 0;
              const renewalCommission = (t.amount ?? 0) * renewalCommissionPct / 100;
              return (
                <li
                  key={t.id}
                  className="kk-card kk-card-hover flex items-center gap-3 px-4 py-3"
                  onClick={() => router.push(`/existing-contracts?open=${t.id}`)}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: days <= 30 ? "var(--kk-red-soft)" : "var(--kk-amber-soft)",
                      color:      days <= 30 ? "#C62828"            : "#B45309",
                    }}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="kk-card-title" style={{ color: "var(--kk-ink)" }}>
                      {t.tenant_name}
                    </p>
                    <p className="kk-card-sub mt-0.5 truncate" style={{ color: "var(--kk-ink-faint)" }}>
                      {t.property_name} · expires {formatDate(t.contract_end ?? "")} · {days}d left
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="kk-card-title tabular-nums" style={{ color: "var(--kk-ink)" }}>
                      RM {Math.round(renewalCommission).toLocaleString()}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                      {renewalCommissionPct}% · if renewed
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

interface CloseableLeadProps {
  leads: Array<{
    id: string;
    owner_name: string;
    property_name: string | null;
    unit: string | null;
    expected_rent: number | null;
  }>;
  commissionPct: number;
}

export function CloseableLeads({ leads, commissionPct }: CloseableLeadProps) {
  const router = useRouter();
  const [sort, setSort] = useState<"desc" | "asc">("desc");

  const sorted = [...leads].sort((a, b) => {
    const diff = (b.expected_rent ?? 0) - (a.expected_rent ?? 0);
    return sort === "desc" ? diff : -diff;
  });

  return (
    <section className="kk-section p-6 lg:p-8">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="kk-section-title mb-1" style={{ color: "var(--kk-ink)" }}>Closeable Leads</p>
          <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>Listed leads, pending tenant match</p>
        </div>
          <FilterSelect
            value={sort}
            onChange={(v) => setSort(v as "desc" | "asc")}
            options={[
              { value: "desc", label: "Rent: high → low" },
              { value: "asc",  label: "Rent: low → high" },
            ]}
            minWidth={160}
          />
      </div>
      {leads.length === 0 ? (
        <p className="kk-body-sm py-6 text-center" style={{ color: "var(--kk-ink-mute)" }}>
          No properties currently listed without a matched tenant.
        </p>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: 520, padding: "8px", margin: "-8px" }}>
          <ul className="space-y-2">
            {sorted.map((l) => {
              const commission = (l.expected_rent ?? 0) * commissionPct / 100;
              return (
                <li
                  key={l.id}
                  className="kk-card kk-card-hover flex items-center gap-3 px-4 py-3"
                  onClick={() => router.push(`/new-owners?open=${l.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="kk-card-title" style={{ color: "var(--kk-ink)" }}>
                      {l.property_name ?? l.owner_name}
                      {l.unit ? <span className="font-normal" style={{ color: "var(--kk-ink-mute)" }}> · Unit {l.unit}</span> : null}
                    </p>
                    <p className="kk-card-sub mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>
                      {l.owner_name}{l.expected_rent != null && ` · RM ${l.expected_rent.toLocaleString()}/mo`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="kk-card-title tabular-nums" style={{ color: "var(--kk-ink)" }}>
                      RM {Math.round(commission).toLocaleString()}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>est. commission</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
