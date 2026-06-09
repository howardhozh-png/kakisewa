"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { TenantProfile } from "@/lib/types";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import {
  Search, User, X as XIcon, Loader2, CheckCircle2, ArrowRight, Home, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { updateTenantProfileAction, removeTenantProfile } from "@/lib/actions";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filter-select";
import { AddTenantButton } from "@/components/add-tenant-button";
import { DateRangeFilter } from "@/components/date-range-filter";

export interface PropertyTenant {
  tenancy_id: string;
  tenant_name: string;
  tenant_phone: string;
  property_name?: string;
  unit?: string;
  expected_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
}

const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest";

// ── Profile detail + edit popup ───────────────────────────────────────
function ProfileDrawer({ profile, onClose }: { profile: TenantProfile; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [pending, startTransition]        = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName]                   = useState(profile.name);
  const [phone, setPhone]                 = useState(profile.phone ?? "");
  const [occupation, setOccupation]       = useState(profile.occupation ?? "");
  const [nationality, setNationality]     = useState(profile.nationality ?? "");
  const [budgetMax, setBudgetMax]         = useState(profile.budget_max != null ? String(profile.budget_max) : "");
  const [bedsPref, setBedsPref]           = useState(profile.bedrooms_pref != null ? String(profile.bedrooms_pref) : "");
  const [moveIn, setMoveIn]               = useState(profile.preferred_move_in ?? today);
  const [availableFrom, setAvailableFrom] = useState(profile.available_from ?? today);
  const [notes, setNotes]                 = useState(profile.notes ?? "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSave() {
    startTransition(async () => {
      const res = await updateTenantProfileAction(profile.id, {
        name: name || profile.name,
        phone: phone || null,
        occupation: occupation || null,
        nationality: nationality || null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        bedrooms_pref: bedsPref ? parseInt(bedsPref, 10) : null,
        preferred_move_in: moveIn || null,
        available_from: availableFrom || null,
        notes: notes || null,
      });
      if (res.ok) { toast.success("Saved"); onClose(); }
      else toast.error("Could not save");
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
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[15px] font-semibold"
              style={{ background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="kk-h3" style={{ color: "var(--kk-ink)" }}>{profile.name}</h2>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                style={profile.intake_completed_at
                  ? { background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }
                  : { background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }
                }
              >
                {profile.intake_completed_at ? "Via form" : "Available"} · Added {format(new Date(profile.created_at), "d MMM yyyy")}
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
            <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Name</label>
            <input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Phone</label>
              <input className={inputCls} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60…" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Occupation</label>
              <input className={inputCls} style={inputStyle} value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Engineer" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Nationality</label>
              <input className={inputCls} style={inputStyle} value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Malaysian" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Budget max (RM)</label>
              <MoneyInput className={inputCls} style={inputStyle} value={budgetMax} onChange={setBudgetMax} placeholder="e.g. 3,000" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Bedrooms pref</label>
              <input type="number" className={inputCls} style={inputStyle} value={bedsPref} onChange={(e) => setBedsPref(e.target.value)} placeholder="2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Preferred move-in</label>
              <DateInput className={inputCls} style={inputStyle} value={moveIn} onChange={setMoveIn} />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Available from</label>
              <DateInput className={inputCls} style={inputStyle} value={availableFrom} onChange={setAvailableFrom} />
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Notes</label>
            <textarea className={inputCls} style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="p-5 border-t space-y-2" style={{ borderColor: "var(--kk-line)" }}>
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--kk-red-bg)", border: "1px solid var(--kk-red-border)" }}>
              <p className="flex-1 text-[12px] font-medium" style={{ color: "var(--destructive)" }}>Delete this tenant permanently?</p>
              <button onClick={() => setConfirmDelete(false)} className="text-[12px] font-medium px-3 py-1.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
              <button disabled={pending}
                onClick={() => startTransition(async () => { await removeTenantProfile(profile.id); onClose(); })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: "var(--destructive)", color: "#fff" }}>
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={pending}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[14px] font-semibold"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </button>
              <button onClick={() => setConfirmDelete(true)} className="flex items-center justify-center gap-2 w-full py-2 text-[13px] font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--kk-ink-faint)" }}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete tenant
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rented tenant detail popup ────────────────────────────────────────
function RentedTenantDialog({ t, onClose }: { t: PropertyTenant; onClose: () => void }) {
  const title = t.unit ? `${t.property_name ?? ""} ${t.unit}`.trim() : t.property_name ?? "Property";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="kk-card w-full max-w-md flex flex-col" style={{ maxHeight: "90vh", overflow: "hidden" }}>
        <div className="flex items-start justify-between gap-3 p-6 border-b" style={{ borderColor: "var(--kk-line)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[15px] font-semibold"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
              {t.tenant_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="kk-h3" style={{ color: "var(--kk-ink)" }}>{t.tenant_name}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                Rented
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <Home className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
            <div className="min-w-0">
              <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>Property</p>
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--kk-ink)" }}>{title}</p>
            </div>
          </div>
          {t.tenant_phone && (
            <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <User className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
              <div>
                <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>Phone</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>{t.tenant_phone}</p>
              </div>
            </div>
          )}
          {t.expected_rent != null && (
            <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <div>
                <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>Monthly rent</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>RM {t.expected_rent.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t" style={{ borderColor: "var(--kk-line)" }}>
          <Link
            href={`/track-renewal?open=${t.tenancy_id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[14px] font-semibold"
            style={{ background: "var(--kk-green-soft)", color: "var(--kk-green-ink)" }}
          >
            <CheckCircle2 className="w-4 h-4" />
            View tenancy
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────
export function TenantsTable({ profiles, propertyTenants = [] }: { profiles: TenantProfile[]; propertyTenants?: PropertyTenant[] }) {
  const [search, setSearch]                 = useState("");
  const [filter, setFilter]                 = useState<"all" | "available" | "rented">("all");
  const [moveInFrom, setMoveInFrom]         = useState("");
  const [moveInTo, setMoveInTo]             = useState("");
  const [selected, setSelected]             = useState<TenantProfile | null>(null);
  const [selectedRented, setSelectedRented] = useState<PropertyTenant | null>(null);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filter === "rented") return false;
      if (moveInFrom && p.preferred_move_in && p.preferred_move_in < moveInFrom) return false;
      if (moveInTo && p.preferred_move_in && p.preferred_move_in > moveInTo) return false;
      if (moveInFrom && !p.preferred_move_in) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q) ||
        (p.occupation ?? "").toLowerCase().includes(q) ||
        (p.nationality ?? "").toLowerCase().includes(q)
      );
    });
  }, [profiles, search, filter, moveInFrom, moveInTo]);

  const filteredRented = useMemo(() => {
    if (filter === "available") return [];
    if (!search.trim()) return propertyTenants;
    const q = search.toLowerCase();
    return propertyTenants.filter((t) =>
      t.tenant_name.toLowerCase().includes(q) ||
      (t.tenant_phone ?? "").includes(q) ||
      (t.property_name ?? "").toLowerCase().includes(q)
    );
  }, [propertyTenants, search, filter]);

  const totalVisible = filteredProfiles.length + filteredRented.length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
          <input
            type="text"
            placeholder="Search by name, phone, property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full text-[13px] outline-none"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
          />
        </div>
        <FilterSelect
          value={filter}
          onChange={(v) => setFilter(v as "all" | "available" | "rented")}
          options={[
            { value: "all",       label: `All (${profiles.length + propertyTenants.length})` },
            { value: "available", label: `Available (${profiles.length})` },
            { value: "rented",    label: `Rented (${propertyTenants.length})` },
          ]}
          minWidth={160}
        />
        <DateRangeFilter label="Move-in date" from={moveInFrom} to={moveInTo} onFrom={setMoveInFrom} onTo={setMoveInTo} />
        <span className="ml-auto text-[12px] shrink-0 pl-3" style={{ color: "var(--kk-ink-mute)" }}>
          {totalVisible} of {profiles.length + propertyTenants.length}
        </span>
      </div>

      {totalVisible === 0 ? (
        <div className="kk-section flex flex-col items-center justify-center gap-4 py-16 px-6">
          {profiles.length === 0 && propertyTenants.length === 0 ? (
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl" style={{ background: "var(--kk-surface-2)" }}>
                👥
              </div>
              <p className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>Add your first tenant</p>
              <p className="kk-body-sm mb-6 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                Send a tenant an intake form via WhatsApp and their profile is created automatically. Or add them manually right now.
              </p>
              <AddTenantButton />
            </div>
          ) : (
            <p className="kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>No profiles match your search.</p>
          )}
        </div>
      ) : (
        <div className="kk-section overflow-hidden kk-scroll-fade">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 600 }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "4%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--kk-line)" }}>
                {["Name", "Phone", "Status", "Property", "Budget", "Move-in", ""].map((h) => (
                  <th key={h} className={TH} style={{ color: "var(--kk-ink-faint)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const isViaForm = !!p.intake_completed_at;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="cursor-pointer group"
                    style={{ borderBottom: "1px solid var(--kk-line)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kk-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>{p.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{p.phone ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={isViaForm
                          ? { background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }
                          : { background: "var(--kk-green-soft)", color: "var(--kk-green-ink)" }
                        }
                      >
                        {isViaForm ? "Via form" : "Available"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
                        {p.budget_max != null ? `RM ${p.budget_max.toLocaleString()}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
                        {p.preferred_move_in ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--kk-ink-mute)" }} />
                    </td>
                  </tr>
                );
              })}
              {filteredRented.map((t) => {
                const property = t.unit ? `${t.property_name ?? ""} ${t.unit}`.trim() : t.property_name ?? "—";
                return (
                  <tr
                    key={t.tenancy_id}
                    onClick={() => setSelectedRented(t)}
                    className="cursor-pointer group"
                    style={{ borderBottom: "1px solid var(--kk-line)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kk-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>{t.tenant_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{t.tenant_phone || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                        Rented
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{property}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
                        {t.expected_rent != null ? `RM ${t.expected_rent.toLocaleString()}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--kk-ink-mute)" }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selected && <ProfileDrawer profile={selected} onClose={() => setSelected(null)} />}
      {selectedRented && <RentedTenantDialog t={selectedRented} onClose={() => setSelectedRented(null)} />}
    </>
  );
}
