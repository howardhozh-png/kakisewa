"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { OwnerLead } from "@/lib/types";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { Megaphone, ArrowRight, Users, X as XIcon, CheckCircle2, Loader2, Search } from "lucide-react";
import { updateOwnerLeadDetails } from "@/lib/actions";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filter-select";
import { DateRangeFilter } from "@/components/date-range-filter";

const BED_OPTIONS = [
  { value: "any", label: "Any beds" },
  { value: "1",   label: "1 bed"   },
  { value: "2",   label: "2 bed"   },
  { value: "3",   label: "3 bed"   },
  { value: "4",   label: "4+ beds" },
];

interface Props {
  listed: OwnerLead[];
  tenantsByLeadId?: Record<string, { tenant_name: string; tenant_phone: string; tenancy_id: string; lifecycle_stage?: string | null }>;
  activeTenants?: Array<{ tenancy_id: string; tenant_name: string; tenant_phone: string | null; property_name: string | null; unit: string | null; amount: number | null; lifecycle_stage: string | null }>;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  active: "Active", headsup: "Head up", pinged: "Pinged",
  renewing: "Renewing", replacing: "Replacing", ending: "Ending",
  stalled: "Stalled",
};

const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest";

export function MatchesView({ listed, tenantsByLeadId = {}, activeTenants = [] }: Props) {
  const [search, setSearch]             = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [bedFilter, setBedFilter]       = useState<string>("any");
  const [minRent, setMinRent]           = useState<string>("");
  const [maxRent, setMaxRent]           = useState<string>("");
  const [stageFilter, setStageFilter]   = useState<"all" | "listed" | "rented">("all");
  const [availFrom, setAvailFrom]       = useState<string>("");
  const [availTo, setAvailTo]           = useState<string>("");
  const [openLead, setOpenLead]         = useState<OwnerLead | null>(null);

  const propertyOptions = useMemo(() => {
    const set = new Set<string>();
    listed.forEach((l) => { if (l.property_name) set.add(l.property_name); });
    return Array.from(set).sort();
  }, [listed]);

  const filtered = useMemo(() => {
    return listed.filter((l) => {
      if (stageFilter === "listed" && l.stage !== "listed") return false;
      if (stageFilter === "rented" && l.stage !== "matched") return false;
      if (propertyFilter && (l.property_name ?? "") !== propertyFilter) return false;
      if (bedFilter !== "any") {
        const target = parseInt(bedFilter, 10);
        if (bedFilter === "4") { if ((l.bedrooms ?? 0) < 4) return false; }
        else { if (l.bedrooms !== target) return false; }
      }
      if (minRent && (l.expected_rent ?? 0) < parseFloat(minRent)) return false;
      if (maxRent && (l.expected_rent ?? Infinity) > parseFloat(maxRent)) return false;
      if (availFrom && l.available_from && l.available_from < availFrom) return false;
      if (availTo && l.available_from && l.available_from > availTo) return false;
      if (availFrom && !l.available_from) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          (l.property_name ?? "").toLowerCase().includes(q) ||
          (l.unit ?? "").toLowerCase().includes(q) ||
          (l.owner_name ?? "").toLowerCase().includes(q) ||
          (tenantsByLeadId[l.id]?.tenant_name ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [listed, stageFilter, propertyFilter, bedFilter, minRent, maxRent, availFrom, availTo, search, tenantsByLeadId]);

  const listedCount  = listed.filter((l) => l.stage === "listed").length;
  const rentedCount  = listed.filter((l) => l.stage === "matched").length + activeTenants.length;
  const hasFilter    = search || propertyFilter || bedFilter !== "any" || minRent || maxRent || stageFilter !== "all" || availFrom || availTo;

  const visibleManaged = stageFilter === "listed" ? [] : activeTenants.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.property_name ?? "").toLowerCase().includes(q) ||
      (t.unit ?? "").toLowerCase().includes(q) ||
      (t.tenant_name ?? "").toLowerCase().includes(q)
    );
  });

  const totalVisible = filtered.length + visibleManaged.length;

  if (listed.length === 0 && activeTenants.length === 0) {
    return (
      <div className="kk-section flex flex-col items-center justify-center gap-5 py-24 px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <Megaphone className="w-6 h-6" style={{ color: "var(--kk-ink-mute)" }} />
        </div>
        <div className="text-center max-w-md">
          <p className="kk-h3" style={{ color: "var(--kk-ink)" }}>No active properties yet</p>
          <p className="mt-2 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
            Move an owner lead to <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>Listed</span> or <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>Matched</span> in the Leads kanban.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search property, owner, tenant…"
            className="pl-9 pr-3 py-1.5 rounded-full text-[13px] outline-none"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", width: 240 }}
          />
        </div>
        <FilterSelect value={propertyFilter} onChange={setPropertyFilter} options={[{ value: "", label: "All properties" }, ...propertyOptions.map((p) => ({ value: p, label: p }))]} minWidth={200} />
        <FilterSelect
          value={stageFilter}
          onChange={(v) => setStageFilter(v as "all" | "listed" | "rented")}
          options={[
            { value: "all",    label: `All (${listedCount + rentedCount})` },
            { value: "listed", label: `Listed (${listedCount})` },
            { value: "rented", label: `Rented / Active (${rentedCount})` },
          ]}
          minWidth={170}
        />
        <FilterSelect value={bedFilter} onChange={setBedFilter} options={BED_OPTIONS} minWidth={120} />
        <NumberFilter value={minRent} onChange={setMinRent} placeholder="Min RM" />
        <NumberFilter value={maxRent} onChange={setMaxRent} placeholder="Max RM" />
        <DateRangeFilter from={availFrom} to={availTo} onFrom={setAvailFrom} onTo={setAvailTo} />
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setPropertyFilter(""); setBedFilter("any"); setMinRent(""); setMaxRent(""); setStageFilter("all"); setAvailFrom(""); setAvailTo(""); }}
            className="kk-pill kk-pill-ghost"
            style={{ padding: "0.25rem 0.7rem", fontSize: "12px" }}
          >
            <XIcon className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="ml-auto shrink-0 text-[12px] pl-3" style={{ color: "var(--kk-ink-mute)" }}>
          {totalVisible} of {listedCount + rentedCount} listings
        </span>
      </div>

      {totalVisible === 0 ? (
        <div className="kk-section flex items-center justify-center py-16">
          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>No properties match your filters.</p>
        </div>
      ) : (
        <div className="kk-section overflow-hidden kk-scroll-fade">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 680 }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "2%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--kk-line)" }}>
                {["Property", "Unit", "Status", "Rent (RM)", "Beds", "Baths", "Owner", "Tenant", ""].map((h) => (
                  <th key={h} className={TH} style={{ color: "var(--kk-ink-faint)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const tenantInfo = l.stage === "matched" ? tenantsByLeadId[l.id] : undefined;
                const isRented = l.stage === "matched";
                return (
                  <tr
                    key={l.id}
                    onClick={() => setOpenLead(l)}
                    className="cursor-pointer group transition-colors"
                    style={{ borderBottom: "1px solid var(--kk-line)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kk-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>{l.property_name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{l.unit ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={isRented
                          ? { background: "rgba(52,199,89,0.14)", color: "#1F8B4C" }
                          : { background: "rgba(0,113,227,0.12)", color: "var(--kk-blue)" }
                        }
                      >
                        {isRented ? "Rented" : "Listed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink)" }}>
                        {l.expected_rent != null ? l.expected_rent.toLocaleString() : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{l.bedrooms ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{l.bathrooms ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{l.owner_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {tenantInfo
                        ? <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{tenantInfo.tenant_name}</span>
                        : <span className="text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--kk-ink-mute)" }} />
                    </td>
                  </tr>
                );
              })}
              {visibleManaged.map((t) => {
                const stage = t.lifecycle_stage ?? "active";
                const stageLabel = LIFECYCLE_LABELS[stage] ?? stage;
                const isEnding = stage === "ending" || stage === "replacing";
                return (
                  <tr
                    key={t.tenancy_id}
                    className="group transition-colors"
                    style={{ borderBottom: "1px solid var(--kk-line)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kk-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>{t.property_name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{t.unit ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={isEnding
                          ? { background: "rgba(239,68,68,0.12)", color: "#B91C1C" }
                          : { background: "rgba(52,199,89,0.14)", color: "#1F8B4C" }
                        }
                      >
                        {stageLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink)" }}>
                        {t.amount != null ? t.amount.toLocaleString() : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span style={{ color: "var(--kk-ink-faint)" }}>—</span></td>
                    <td className="px-4 py-3"><span style={{ color: "var(--kk-ink-faint)" }}>—</span></td>
                    <td className="px-4 py-3"><span style={{ color: "var(--kk-ink-faint)" }}>—</span></td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{t.tenant_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/existing-contracts?open=${t.tenancy_id}`} onClick={(e) => e.stopPropagation()}>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--kk-ink-mute)" }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <PropertyDetailDialog
        lead={openLead}
        tenantInfo={openLead ? tenantsByLeadId[openLead.id] ?? null : null}
        onClose={() => setOpenLead(null)}
        onLeadUpdated={(updated) => setOpenLead((prev) => prev ? { ...prev, ...updated } : prev)}
      />
    </>
  );
}

function PropertyDetailDialog({
  lead, tenantInfo, onClose, onLeadUpdated,
}: {
  lead: OwnerLead | null;
  tenantInfo: { tenant_name: string; tenant_phone: string; tenancy_id: string } | null;
  onClose: () => void;
  onLeadUpdated: (updated: Partial<OwnerLead>) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [pending, startTransition] = useTransition();
  const [propertyName, setPropertyName] = useState("");
  const [unit, setUnit]                 = useState("");
  const [rent, setRent]                 = useState("");
  const [beds, setBeds]                 = useState("");
  const [baths, setBaths]               = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [notes, setNotes]               = useState("");

  useEffect(() => {
    if (!lead) return;
    setPropertyName(lead.property_name ?? "");
    setUnit(lead.unit ?? "");
    setRent(lead.expected_rent != null ? String(lead.expected_rent) : "");
    setBeds(lead.bedrooms != null ? String(lead.bedrooms) : "");
    setBaths(lead.bathrooms != null ? String(lead.bathrooms) : "");
    setAvailableFrom(lead.available_from ?? today);
    setNotes(lead.notes ?? "");
  }, [lead?.id]);

  useEffect(() => {
    if (!lead) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lead, onClose]);

  if (!lead) return null;

  const title = unit ? `${propertyName} ${unit}`.trim() : propertyName || "Owner property";

  function handleSave() {
    if (!lead) return;
    const updates = {
      property_name: propertyName || null,
      unit: unit || null,
      expected_rent: rent ? parseFloat(rent) : null,
      bedrooms: beds ? parseInt(beds, 10) : null,
      bathrooms: baths ? parseInt(baths, 10) : null,
      available_from: availableFrom || null,
      notes: notes || null,
    };
    startTransition(async () => {
      const res = await updateOwnerLeadDetails(lead.id, updates);
      if (res?.ok === false) { toast.error("Could not save"); return; }
      onLeadUpdated(updates);
      toast.success("Saved");
      onClose();
    });
  }

  const inputCls   = "w-full text-[13px] px-3 py-2 rounded-xl outline-none";
  const inputStyle = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  const labelCls   = "text-[11px] font-medium mb-1 block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="kk-card w-full max-w-md flex flex-col" style={{ maxHeight: "90vh", overflow: "hidden" }}>
        <div className="flex items-start justify-between gap-3 p-6 border-b" style={{ borderColor: "var(--kk-line)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={lead.stage === "matched"
                ? { background: "rgba(52,199,89,0.15)", color: "#1F8B4C" }
                : { background: "rgba(0,113,227,0.12)", color: "var(--kk-blue)" }
              }
            >
              {lead.stage === "matched" ? <CheckCircle2 className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="kk-h3 truncate" style={{ color: "var(--kk-ink)" }}>{title}</h2>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                style={lead.stage === "matched"
                  ? { background: "rgba(52,199,89,0.14)", color: "#1F8B4C" }
                  : { background: "rgba(0,113,227,0.12)", color: "var(--kk-blue)" }
                }
              >
                {lead.stage === "matched" ? "Rented" : "Listed"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
          <div>
            <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Property name</label>
            <input className={inputCls} style={inputStyle} value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="e.g. Agile Mont Kiara" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Unit</label>
              <input className={inputCls} style={inputStyle} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="A-5205" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Expected rent (RM/mo)</label>
              <MoneyInput className={inputCls} style={inputStyle} value={rent} onChange={setRent} placeholder="e.g. 3,000" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Bedrooms</label>
              <input type="number" className={inputCls} style={inputStyle} value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="2" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Bathrooms</label>
              <input type="number" className={inputCls} style={inputStyle} value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="2" />
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Available from</label>
            <DateInput className={inputCls} style={inputStyle} value={availableFrom} onChange={setAvailableFrom} />
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Notes</label>
            <textarea className={inputCls} style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="High floor, city view…" />
          </div>
          {tenantInfo && (
            <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#1F8B4C" }} />
              <div className="min-w-0">
                <p className="text-[10px]" style={{ color: "#1F8B4C" }}>Current tenant</p>
                <p className="text-[13px] font-semibold truncate" style={{ color: "#1F8B4C" }}>{tenantInfo.tenant_name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t flex flex-col gap-2" style={{ borderColor: "var(--kk-line)" }}>
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-[13px] font-semibold"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save changes
          </button>
          {lead.stage === "matched" && tenantInfo ? (
            <Link href={`/existing-contracts?open=${tenantInfo.tenancy_id}`} onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-[13px] font-semibold"
              style={{ background: "rgba(52,199,89,0.14)", color: "#1F8B4C" }}>
              <Users className="w-4 h-4" />
              Manage existing tenant
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link href={`/matching/${lead.id}`} onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[14px] font-semibold"
              style={{ background: "var(--kk-green)", color: "#fff" }}>
              Build tenant pack
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberFilter({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <MoneyInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="text-[13px] px-3 py-1.5 rounded-full"
      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", width: 110 }}
    />
  );
}
