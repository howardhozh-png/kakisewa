"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { MatchPack, PackTenant, TenantProfile, PendingIntake } from "@/lib/types";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import {
  quickAddTenantToPack,
  detachTenantFromPack,
  buildSendPackToOwner,
  addExistingTenantToPack,
  addInterestedTenantToListing,
  removeInterestedTenant,
  updateTenantProfileAction,
} from "@/lib/actions";
import {
  Copy, Check, ExternalLink, Trash2, Loader2, User, Heart,
  Send, Search, UserPlus, Clock, RefreshCw, X, Phone, Briefcase, Globe,
  BedDouble, Bath, CalendarDays, Users2, DollarSign,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { toast } from "sonner";
import { useWhatsAppGate } from "@/hooks/use-whatsapp-gate";
import { WhatsAppGateDialog } from "@/components/whatsapp-gate-dialog";

interface Props {
  pack: MatchPack;
  initialTenants: PackTenant[];
  initialPending: PendingIntake[];
  shareUrl: string;
  ownerLeadId: string;
  availableProfiles: TenantProfile[];
  leadPropertyName?: string;
  leadPropertyUnit?: string;
}

type AddMode = "none" | "add";
type TenantSubMode = "whatsapp" | "manual" | "pool";

export function MatchPackBuilder({
  pack, initialTenants, initialPending, shareUrl, ownerLeadId, availableProfiles,
  leadPropertyName, leadPropertyUnit,
}: Props) {
  // Build property label from live lead data (pack.property_label is a stale snapshot)
  const livePropertyLabel = leadPropertyName
    ? leadPropertyUnit ? `${leadPropertyName}, Unit ${leadPropertyUnit}` : leadPropertyName
    : pack.property_label ?? undefined;
  const [tenants, setTenants] = useState<PackTenant[]>(initialTenants);
  const [pending, setPending] = useState<PendingIntake[]>(initialPending);
  const [currentShareUrl, setCurrentShareUrl] = useState(shareUrl);
  const [addMode, setAddMode] = useState<AddMode>("none");
  const [copied, setCopied] = useState(false);
  const [sending, startSend] = useTransition();
  const { gateOpen, setGateOpen, missingFields, checkAndRun } = useWhatsAppGate();
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<PackTenant | null>(null);

  const isRanked = tenants.some((t) => t.rank != null);
  const sortedTenants = useMemo(() => {
    if (!isRanked) return tenants;
    return [...tenants].sort((a, b) => {
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
  }, [tenants, isRanked]);

  // Poll every 30s while there are pending intakes or unranked tenants
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/matching/${ownerLeadId}/poll`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { pending: PendingIntake[]; tenants: PackTenant[] };
      setLastPoll(new Date());

      const newTenants = data.tenants.filter(
        (t) => !tenants.some((existing) => existing.id === t.id)
      );
      const rankChanged = data.tenants.some((t) => {
        const existing = tenants.find((e) => e.id === t.id);
        return existing && (existing.rank !== t.rank || existing.liked !== t.liked);
      });

      if (newTenants.length > 0 || rankChanged) {
        setTenants(data.tenants);
        newTenants.forEach((t) => toast.success(`${t.name} just filled in their details!`));
        if (rankChanged && newTenants.length === 0) {
          toast.success("Owner has updated their ranking");
        }
      }
      setPending(data.pending);
    } catch { /* network error — skip */ }
  }, [ownerLeadId, pending, tenants]);

  useEffect(() => {
    // Poll while pending intakes exist OR tenants haven't been ranked yet (watching for owner action)
    if (pending.length === 0 && tenants.length === 0) return;
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [pending.length, tenants.length, poll]);

  function sendToOwnerWhatsApp() {
    if (tenants.length === 0) {
      toast.error("Add at least one tenant before sending");
      return;
    }
    checkAndRun(() => {
      startSend(async () => {
        const res = await buildSendPackToOwner(ownerLeadId);
        if (!res.ok) { toast.error(res.message); return; }
        if (res.newShareUrl) setCurrentShareUrl(res.newShareUrl);
        window.open(res.url, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with link to owner");
      });
    });
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(currentShareUrl);
    setCopied(true);
    toast.success("Share link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemovePending(token: string) {
    setPending((prev) => prev.filter((p) => p.token !== token));
    await removeInterestedTenant(token, ownerLeadId);
  }

  async function handleRemove(tenantId: string) {
    setTenants((prev) => prev.filter((t) => t.id !== tenantId));
    const res = await detachTenantFromPack(pack.id, tenantId);
    if (!res.ok) {
      toast.error("Could not remove");
      // Re-fetch to restore
      const data = await fetch(`/api/matching/${ownerLeadId}/poll`, { cache: "no-store" }).then((r) => r.json()) as { tenants: PackTenant[] };
      setTenants(data.tenants);
    }
  }

  const isEmpty = tenants.length === 0 && pending.length === 0;

  return (
    <>
    {selectedTenant && (
      <TenantDetailModal
        t={selectedTenant}
        propertyLabel={livePropertyLabel}
        onClose={() => setSelectedTenant(null)}
        onUpdate={(updated) => {
          setTenants((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
          setSelectedTenant((prev) => prev ? { ...prev, ...updated } : prev);
        }}
      />
    )}
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Left: tenant cards */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="kk-h2" style={{ color: "var(--kk-ink)" }}>
            Tenants in this pack
          </h2>
          <div className="flex items-center gap-3">
            {lastPoll && pending.length > 0 && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--kk-ink-faint)" }}>
                <RefreshCw className="w-3 h-3" />
                Live
              </span>
            )}
            <p className="kk-caption">{tenants.length} confirmed · {pending.length} pending</p>
          </div>
        </div>

        {/* Pending intake cards */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--kk-ink-mute)" }}>
              Awaiting form response
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {pending.map((p) => (
                <PendingCard key={p.token} intake={p} onRemove={() => handleRemovePending(p.token)} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && addMode === "none" && (
          <div className="kk-section flex flex-col items-center justify-center gap-4 py-14 px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--kk-surface-2)" }}>
              <User className="w-5 h-5" style={{ color: "var(--kk-ink-mute)" }} />
            </div>
            <p className="kk-body-sm text-center max-w-md" style={{ color: "var(--kk-ink-mute)" }}>
              Add tenants who&apos;ve expressed interest. Enter their name and phone from PropertyGuru. They&apos;ll receive a WhatsApp form to fill in the rest.
            </p>
            <button onClick={() => setAddMode("add")} className="kk-pill kk-pill-primary">
              <UserPlus className="w-3.5 h-3.5" /> Add interested tenant
            </button>
          </div>
        )}

        {/* Confirmed tenant cards */}
        {tenants.length > 0 && (
          <div className="space-y-3">
            {isRanked && (
              <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--kk-ink-mute)" }}>
                <Heart className="w-3 h-3 fill-current" style={{ color: "var(--kk-red)" }} />
                Sorted by owner&apos;s preference
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {sortedTenants.map((t) => (
                <TenantCard key={t.id} t={t} onRemove={() => handleRemove(t.id)} onClick={() => setSelectedTenant(t)} />
              ))}
            </div>
          </div>
        )}

        {/* Unified add tenant panel */}
        {addMode === "add" && (
          <AddTenantPanel
            packId={pack.id}
            ownerLeadId={ownerLeadId}
            pack={pack}
            profiles={availableProfiles.filter((p) => !tenants.some((t) => t.id === p.id))}
            onPendingAdded={(intake) => setPending((prev) => [intake, ...prev])}
            onTenantAdded={(tenant) => {
              setTenants((prev) => [...prev, { ...tenant, position: prev.length, rank: null, liked: 0 }]);
            }}
            onClose={() => setAddMode("none")}
          />
        )}

        {/* Bottom action button */}
        {addMode === "none" && !isEmpty && (
          <button
            onClick={() => setAddMode("add")}
            className="w-full rounded-2xl py-4 text-[13px] font-medium flex items-center justify-center gap-2"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", border: "1px dashed var(--kk-line-strong)" }}
          >
            <UserPlus className="w-4 h-4" /> Add tenant
          </button>
        )}
      </div>

      {/* Right: share panel */}
      <aside className="space-y-6">
        <section className="kk-section p-5">
          <p className="kk-overline mb-3">Share with owner</p>
          <p className="text-[13px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>
            Anyone with this link can view + rank the tenant cards. No login required.
          </p>
          <div
            className="rounded-xl px-3 py-2.5 text-[12px] font-mono break-all mb-3"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-soft)" }}
          >
            {currentShareUrl}
          </div>
          <button
            onClick={sendToOwnerWhatsApp}
            disabled={sending || tenants.length === 0}
            className="kk-pill kk-pill-primary w-full justify-center mb-2"
            style={{ padding: "0.6rem 1rem" }}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Opening WhatsApp…" : "Send to owner via WhatsApp"}
          </button>
          <div className="flex gap-2">
            <button onClick={copyShareUrl} className="kk-pill kk-pill-ghost flex-1 justify-center">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
            </button>
            <a href={currentShareUrl} target="_blank" rel="noopener noreferrer" className="kk-pill kk-pill-ghost">
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </a>
          </div>
        </section>

        {tenants.some((t) => t.rank != null || t.liked === 1) && (
          <section className="kk-section p-5">
            <p className="kk-overline mb-3">Owner&apos;s ranking</p>
            <ul className="space-y-2.5 text-[13px]">
              {tenants
                .slice()
                .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                .map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums shrink-0"
                      style={{
                        background: t.rank != null ? "var(--kk-purple-soft)" : "var(--kk-surface-2)",
                        color: t.rank != null ? "#6F2DA8" : "var(--kk-ink-faint)",
                      }}
                    >
                      {t.rank != null ? t.rank : "—"}
                    </span>
                    <span className="flex-1" style={{ color: "var(--kk-ink)" }}>{t.name}</span>
                    {t.liked === 1 && <Heart className="w-3.5 h-3.5 fill-current" style={{ color: "var(--kk-red)" }} />}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
    <WhatsAppGateDialog open={gateOpen} onOpenChange={setGateOpen} missingFields={missingFields} />
    </>
  );
}

// ─── Pending intake card ───────────────────────────────────────────────────────

function PendingCard({ intake, onRemove }: { intake: PendingIntake; onRemove: () => void }) {
  return (
    <div
      className="kk-card p-5 flex items-center gap-4 group"
      style={{ borderStyle: "dashed", opacity: 0.85 }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--kk-surface-2)" }}
      >
        <Clock className="w-4 h-4" style={{ color: "var(--kk-ink-mute)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: "var(--kk-ink)" }}>
          {intake.name ?? "Unknown"}
        </p>
        {intake.phone && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{intake.phone}</p>
        )}
        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "var(--kk-ink-mute)" }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#F59E0B" }}
          />
          Form sent · awaiting reply
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ background: "#FEF3C7", color: "#92400E" }}
        >
          Pending
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
          style={{ color: "var(--kk-ink-faint)" }}
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Unified add tenant panel ──────────────────────────────────────────────────

function AddTenantPanel({
  packId, ownerLeadId, profiles, pack, onPendingAdded, onTenantAdded, onClose,
}: {
  packId: string;
  ownerLeadId: string;
  profiles: TenantProfile[];
  pack: MatchPack;
  onPendingAdded: (intake: PendingIntake) => void;
  onTenantAdded: (t: TenantProfile) => void;
  onClose: () => void;
}) {
  const [sub, setSub] = useState<TenantSubMode>("whatsapp");

  const tabs: { key: TenantSubMode; label: string }[] = [
    { key: "whatsapp", label: "Send form" },
    { key: "manual",   label: "Type details" },
    ...(profiles.length > 0 ? [{ key: "pool" as TenantSubMode, label: `From pool (${profiles.length})` }] : []),
  ];

  return (
    <div className="kk-section p-5 space-y-5">
      {/* Tab bar + cancel */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--kk-surface-2)" }}>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSub(key)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: sub === key ? "var(--kk-surface)" : "transparent",
                color: sub === key ? "var(--kk-ink)" : "var(--kk-ink-mute)",
                boxShadow: sub === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="shrink-0 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          Cancel
        </button>
      </div>

      {sub === "whatsapp" && (
        <WaFormContent ownerLeadId={ownerLeadId} onPendingAdded={onPendingAdded} onClose={onClose} />
      )}
      {sub === "manual" && (
        <ManualEntryContent packId={packId} onAdded={(t) => { onTenantAdded(t); onClose(); }} />
      )}
      {sub === "pool" && (
        <PoolContent
          packId={packId}
          profiles={profiles}
          pack={pack}
          onAdded={onTenantAdded}
          onSwitchToManual={() => setSub("manual")}
        />
      )}
    </div>
  );
}

function WaFormContent({ ownerLeadId, onPendingAdded, onClose }: {
  ownerLeadId: string;
  onPendingAdded: (intake: PendingIntake) => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState("");

  function handleGenerate() {
    if (!name.trim()) return toast.error("Name is required");
    if (!phone.trim()) return toast.error("Phone number is required");
    startTransition(async () => {
      const res = await addInterestedTenantToListing(name.trim(), phone.trim(), ownerLeadId);
      if (!res.ok) { toast.error(res.message); return; }
      setSavedToken(res.token ?? "");
      setWaUrl(res.waUrl);
      onPendingAdded({ token: res.token ?? "", name: name.trim(), phone: phone.trim(), created_at: new Date().toISOString() });
    });
  }

  if (waUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DCFCE7" }}>
            <Check className="w-5 h-5" style={{ color: "#16A34A" }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>{name} added. Now send the form.</p>
            <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>WhatsApp opens with their number and the form link pre-composed</p>
          </div>
        </div>
        <button
          onClick={() => { window.open(waUrl, "_blank", "noopener,noreferrer"); onClose(); }}
          className="kk-pill kk-pill-primary w-full justify-center"
          style={{ padding: "0.65rem 1rem" }}
        >
          <Send className="w-3.5 h-3.5" /> Open WhatsApp to send form
        </button>
        <button onClick={onClose} className="w-full text-center text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          Done, I&apos;ll send later
        </button>
        <span className="hidden">{savedToken}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
        Enter details from their PropertyGuru inquiry. They&apos;ll receive a WhatsApp form to fill in the rest.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Leong Chia Wen" required full />
        <Field label="WhatsApp number" value={phone} onChange={setPhone} placeholder="60163119330" required full />
      </div>
      <div className="flex justify-end">
        <button type="button" className="kk-pill kk-pill-primary" onClick={handleGenerate} disabled={pending}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {pending ? "Generating…" : "Generate WhatsApp form"}
        </button>
      </div>
    </div>
  );
}

// ─── Tenant detail modal ───────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0" style={{ color: "var(--kk-ink-mute)" }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>{label}</p>
        <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{value}</p>
      </div>
    </div>
  );
}

function TenantDetailModal({
  t, propertyLabel, onClose, onUpdate,
}: {
  t: PackTenant;
  propertyLabel?: string;
  onClose: () => void;
  onUpdate: (updated: PackTenant) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTx] = useTransition();

  // Edit form state
  const [name, setName]               = useState(t.name);
  const [phone, setPhone]             = useState(t.phone ?? "");
  const [occupation, setOccupation]   = useState(t.occupation ?? "");
  const [nationality, setNationality] = useState(t.nationality ?? "");
  const [budgetMax, setBudgetMax]     = useState(t.budget_max != null ? String(t.budget_max) : "");
  const [income, setIncome]           = useState(t.monthly_income != null ? String(t.monthly_income) : "");
  const [bedsPref, setBedsPref]       = useState(t.bedrooms_pref != null ? String(t.bedrooms_pref) : "");
  const [moveIn, setMoveIn]           = useState(t.preferred_move_in ? isoToDMY(t.preferred_move_in) : "");
  const [occupants, setOccupants]     = useState(t.occupants != null ? String(t.occupants) : "");
  const [notes, setNotes]             = useState(t.notes ?? "");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (editing) setEditing(false); else onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, editing]);

  function handleSave() {
    startTx(async () => {
      const data = {
        name: name.trim() || t.name,
        phone: phone.trim() || null,
        occupation: occupation.trim() || null,
        nationality: nationality.trim() || null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        monthly_income: income ? parseFloat(income) : null,
        bedrooms_pref: bedsPref ? parseInt(bedsPref, 10) : null,
        preferred_move_in: dmyToIso(moveIn) || null,
        occupants: occupants ? parseInt(occupants, 10) : null,
        notes: notes.trim() || null,
      };
      const res = await updateTenantProfileAction(t.id, data);
      if (res.ok) {
        onUpdate({ ...t, ...data });
        setEditing(false);
      }
    });
  }

  const budget = t.budget_max
    ? `up to RM ${t.budget_max.toLocaleString()}/mo`
    : t.budget_min ? `from RM ${t.budget_min.toLocaleString()}/mo` : null;

  const waPhone = (() => { const d = (t.phone ?? "").replace(/\D/g, ""); return d.startsWith("0") ? "60" + d.slice(1) : d; })();
  // Use everything after the first space as "first name" (handles Chinese surname-first format)
  const givenName = t.name.includes(" ") ? t.name.slice(t.name.indexOf(" ") + 1) : t.name;
  const property = propertyLabel ?? "the property";
  const waMsg = encodeURIComponent(
    `Hi ${givenName}! I'd like to arrange a house viewing for you at ${property}. When would be a good time?`
  );
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : null;

  const inputCls = "w-full text-[13px] px-3 py-2 rounded-xl outline-none";
  const inputStyle = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  const labelCls = "text-[11px] font-medium mb-1 block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="kk-card w-full max-w-md flex flex-col"
        style={{ maxHeight: "88vh", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between gap-3" style={{ borderColor: "var(--kk-line)" }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.013em" }}>
                {editing ? name : t.name}
              </h2>
              {t.rank != null && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: t.rank === 1 ? "var(--kk-ink)" : "var(--kk-purple-soft)", color: t.rank === 1 ? "#fff" : "#6F2DA8" }}
                >
                  Owner #{t.rank}
                </span>
              )}
              {t.liked === 1 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold" style={{ background: "var(--kk-red-soft)", color: "var(--kk-red)" }}>
                  <Heart className="w-3 h-3 fill-current" /> Wants viewing
                </span>
              )}
            </div>
            {!editing && (
              <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                {[t.age && `${t.age} yrs`, t.occupation, t.nationality].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[12px] px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-70"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)" }}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {editing ? (
            <div className="space-y-4">
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
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Nationality</label>
                  <input className={inputCls} style={inputStyle} value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Malaysian" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Occupation</label>
                  <input className={inputCls} style={inputStyle} value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Engineer" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Monthly income (RM)</label>
                  <MoneyInput className={inputCls} style={inputStyle} value={income} onChange={setIncome} placeholder="e.g. 6,000" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Budget max (RM)</label>
                  <MoneyInput className={inputCls} style={inputStyle} value={budgetMax} onChange={setBudgetMax} placeholder="e.g. 3,000" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Bedrooms pref</label>
                  <input type="number" className={inputCls} style={inputStyle} value={bedsPref} onChange={(e) => setBedsPref(e.target.value)} placeholder="2" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Move-in date</label>
                  <input type="text" placeholder="DD/MM/YYYY" className={inputCls} style={inputStyle} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Occupants</label>
                  <input type="number" className={inputCls} style={inputStyle} value={occupants} onChange={(e) => setOccupants(e.target.value)} placeholder="2" />
                </div>
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--kk-ink-faint)" }}>Notes</label>
                <textarea className={inputCls} style={{ ...inputStyle, minHeight: 64, resize: "vertical" } as React.CSSProperties} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {t.phone && <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={t.phone} />}
              {t.occupation && <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Occupation" value={t.occupation} />}
              {t.nationality && <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Nationality" value={t.nationality} />}
              {budget && <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Budget" value={budget} />}
              {t.monthly_income != null && (
                <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Monthly income" value={`RM ${t.monthly_income.toLocaleString()}`} />
              )}
              {(t.bedrooms_pref != null || t.bathrooms_pref != null) && (
                <InfoRow
                  icon={<BedDouble className="w-3.5 h-3.5" />}
                  label="Preference"
                  value={[t.bedrooms_pref != null && `${t.bedrooms_pref} bed`, t.bathrooms_pref != null && `${t.bathrooms_pref} bath`].filter(Boolean).join(" · ")}
                />
              )}
              {t.preferred_move_in && (
                <InfoRow icon={<CalendarDays className="w-3.5 h-3.5" />} label="Move-in" value={formatDate(t.preferred_move_in)} />
              )}
              {t.occupants != null && (
                <InfoRow icon={<Users2 className="w-3.5 h-3.5" />} label="Occupants" value={`${t.occupants} person${t.occupants === 1 ? "" : "s"}`} />
              )}
              {(t.pets === 1 || t.smoking === 1) && (
                <InfoRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Lifestyle"
                  value={[t.pets === 1 && "Has pets", t.smoking === 1 && "Smokes"].filter(Boolean).join(" · ")}
                />
              )}
              {t.notes && (
                <div className="rounded-xl p-3" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Notes</p>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kk-ink)" }}>{t.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t" style={{ borderColor: "var(--kk-line)" }}>
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-opacity hover:opacity-70"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={pending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          ) : waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-90"
              style={{ background: "#25D366", color: "#fff" }}
            >
              <WhatsAppIcon className="w-5 h-5" />
              Contact for house viewing
            </a>
          ) : (
            <p className="text-center text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>
              No phone number — tap Edit to add one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirmed tenant card ─────────────────────────────────────────────────────

function TenantCard({ t, onRemove, onClick }: { t: PackTenant; onRemove: () => void; onClick: () => void }) {
  const budget = t.budget_max ? `up to RM ${t.budget_max.toLocaleString()}` : t.budget_min ? `from RM ${t.budget_min.toLocaleString()}` : null;
  return (
    <div
      className="kk-card kk-card-hover p-5 flex flex-col gap-3 group relative cursor-pointer"
      onClick={onClick}
    >
      {t.rank != null && t.rank <= 3 && (
        <span
          className="absolute -top-2 -left-2 w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold tabular-nums shadow-sm"
          style={{
            background: t.rank === 1 ? "var(--kk-ink)" : "#fff",
            color: t.rank === 1 ? "#fff" : "var(--kk-ink)",
            border: t.rank !== 1 ? "1px solid var(--kk-line)" : "none",
          }}
          title={`Owner ranked #${t.rank}`}
        >
          {t.rank}
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.011em" }}>
            {t.name}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
            {[t.age, t.occupation, t.nationality].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
          style={{ color: "var(--kk-ink-faint)" }}
          aria-label="Remove from pack"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {budget && <Pill bg="var(--kk-green-soft)" ink="#1F8B4C">{budget}</Pill>}
        {t.nationality && <Pill>{t.nationality}</Pill>}
        {t.bedrooms_pref != null && <Pill>{t.bedrooms_pref} bed</Pill>}
        {t.bathrooms_pref != null && <Pill>{t.bathrooms_pref} bath</Pill>}
        {t.preferred_move_in && <Pill bg="var(--kk-blue-soft)" ink="var(--kk-blue)">Move {formatDate(t.preferred_move_in)}</Pill>}
        {t.occupants != null && <Pill>{t.occupants} occupant{t.occupants === 1 ? "" : "s"}</Pill>}
        {t.pets === 1 && <Pill>🐾 pets</Pill>}
        {t.smoking === 1 && <Pill>🚬 smokes</Pill>}
      </div>

      {t.notes && (
        <p className="text-[12px] leading-snug break-words" style={{ color: "var(--kk-ink-mute)" }}>{t.notes}</p>
      )}

      {(t.rank != null || t.liked === 1) && (
        <div className="pt-3 border-t flex items-center gap-2 text-[11px]" style={{ borderColor: "var(--kk-line)" }}>
          {t.rank != null && (
            <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--kk-purple-soft)", color: "#6F2DA8" }}>
              Owner ranked #{t.rank}
            </span>
          )}
          {t.liked === 1 && (
            <span className="px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "var(--kk-red-soft)", color: "var(--kk-red)" }}>
              <Heart className="w-3 h-3 fill-current" /> Wants viewing
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pool content (inside unified panel) ──────────────────────────────────────

function matchScore(p: TenantProfile, pack: MatchPack): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (pack.property_rent != null && p.budget_max != null && p.budget_max >= pack.property_rent) {
    score += 2;
    reasons.push(`budget fits (≤RM ${p.budget_max.toLocaleString()})`);
  }
  if (pack.property_beds != null && p.bedrooms_pref != null && p.bedrooms_pref === pack.property_beds) {
    score += 2;
    reasons.push(`${p.bedrooms_pref} bed preference matches`);
  }
  if (p.preferred_move_in) {
    const moveIn = new Date(p.preferred_move_in);
    const now = new Date();
    const diffDays = (moveIn.getTime() - now.getTime()) / 86400000;
    if (diffDays >= -7 && diffDays <= 60) {
      score += 1;
      reasons.push("move-in date soon");
    }
  }
  return { score, reasons };
}

function PoolContent({ packId, profiles, pack, onAdded, onSwitchToManual }: {
  packId: string;
  profiles: TenantProfile[];
  pack: MatchPack;
  onAdded: (t: TenantProfile) => void;
  onSwitchToManual: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const suggested = useMemo(() => {
    if (!pack.property_rent && !pack.property_beds) return [];
    return profiles
      .map((p) => ({ p, ...matchScore(p, pack) }))
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [profiles, pack]);

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.occupation ?? "").toLowerCase().includes(q) ||
      (p.nationality ?? "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  async function handleAdd(profile: TenantProfile) {
    setAdding(profile.id);
    const res = await addExistingTenantToPack(packId, profile.id);
    setAdding(null);
    if (res.ok) {
      setAddedIds((prev) => new Set([...prev, profile.id]));
      onAdded(profile);
      toast.success(`${profile.name} added to pack`);
    } else {
      toast.error("Could not add tenant");
    }
  }

  return (
    <div className="space-y-4">
      {/* Smart suggestions */}
      {suggested.length > 0 && !search && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--kk-ink-faint)" }}>
            Suggested matches
          </p>
          <ul className="space-y-1.5">
            {suggested.map(({ p, reasons }) => {
              const isAdded = addedIds.has(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: "var(--kk-green-soft)", border: "1px solid rgba(52,199,89,0.2)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>{p.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#1F8B4C" }}>{reasons.join(" · ")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isAdded && handleAdd(p)}
                    disabled={isAdded || adding === p.id}
                    className="kk-pill shrink-0 text-[12px] px-3 py-1.5"
                    style={{ background: isAdded ? "var(--kk-green-soft)" : "var(--kk-green)", color: isAdded ? "#1F8B4C" : "#fff", opacity: adding === p.id ? 0.6 : 1 }}
                  >
                    {adding === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isAdded ? <><Check className="w-3 h-3" /> Added</> : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3" style={{ height: 1, background: "var(--kk-line)" }} />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
        <input
          type="text"
          placeholder="Search by name, occupation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[13px] pl-8 pr-3 py-2 rounded-xl"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13px] text-center py-6" style={{ color: "var(--kk-ink-mute)" }}>No matching profiles</p>
      ) : (
        <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {filtered.map((p) => {
            const isAdded = addedIds.has(p.id);
            const isAdding = adding === p.id;
            const budget = p.budget_max ? `≤ RM ${p.budget_max.toLocaleString()}` : p.budget_min ? `≥ RM ${p.budget_min.toLocaleString()}` : null;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--kk-surface-2)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>{p.name}</p>
                    {p.source === "intake_form" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--kk-green-soft)", color: "#1F8B4C" }}>
                        via form
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--kk-ink-faint)" }}>
                    {[p.occupation, p.nationality, budget, p.bedrooms_pref != null ? `${p.bedrooms_pref} bed` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isAdded && handleAdd(p)}
                  disabled={isAdded || isAdding}
                  className="kk-pill shrink-0 text-[12px] px-3 py-1.5"
                  style={{
                    background: isAdded ? "var(--kk-green-soft)" : "var(--kk-ink)",
                    color: isAdded ? "#1F8B4C" : "#fff",
                    opacity: isAdding ? 0.6 : 1,
                  }}
                >
                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : isAdded ? <><Check className="w-3 h-3" /> Added</> : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--kk-line)" }}>
        <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>Don&apos;t see them?</p>
        <button onClick={onSwitchToManual} className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>
          Type their details →
        </button>
      </div>
    </div>
  );
}

// ─── Manual entry content (inside unified panel) ───────────────────────────────

function ManualEntryContent({ packId, onAdded }: {
  packId: string;
  onAdded: (t: TenantProfile) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [age, setAge]             = useState("");
  const [occupation, setOccupation] = useState("");
  const [nationality, setNationality] = useState("");
  const [income, setIncome]       = useState("");
  const [budget, setBudget]       = useState("");
  const [beds, setBeds]           = useState("");
  const [moveIn, setMoveIn]       = useState("");
  const [occupants, setOccupants] = useState("");
  const [pets, setPets]           = useState(false);
  const [smoking, setSmoking]     = useState(false);
  const [notes, setNotes]         = useState("");

  function handleSave() {
    if (!name.trim())       return toast.error("Name is required");
    if (!phone.trim())      return toast.error("Phone is required");
    if (!age.trim())        return toast.error("Age is required");
    if (!nationality.trim()) return toast.error("Nationality is required");
    if (!occupation.trim()) return toast.error("Occupation is required");
    if (!budget.trim())     return toast.error("Max budget is required");
    if (!moveIn.trim())     return toast.error("Move-in date is required");
    startTransition(async () => {
      try {
        const res = await quickAddTenantToPack(packId, {
          name: name.trim(), phone: phone || null,
          age: age ? parseInt(age, 10) : null, occupation: occupation || null,
          nationality: nationality || null, monthly_income: income ? parseFloat(income) : null,
          budget_max: budget ? parseFloat(budget) : null, bedrooms_pref: beds ? parseInt(beds, 10) : null,
          preferred_move_in: dmyToIso(moveIn) || null, occupants: occupants ? parseInt(occupants, 10) : null,
          pets: pets ? 1 : 0, smoking: smoking ? 1 : 0, notes: notes || null, source: "manual",
        });
        if (res.ok) {
          onAdded(res.tenant);
          toast.success(`${res.tenant.name} added to pack`);
        } else {
          toast.error(res.message ?? "Could not add tenant");
        }
      } catch (err) {
        console.error("[ManualEntry] add failed:", err);
        toast.error("Could not add tenant — please try again");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" value={name} onChange={setName} placeholder="Full name" required full />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="60123456789" required />
        <Field label="Age" value={age} onChange={setAge} type="number" required />
        <Field label="Nationality" value={nationality} onChange={setNationality} placeholder="Malaysian" required />
        <Field label="Occupation" value={occupation} onChange={setOccupation} placeholder="Engineer" required />
        <Field label="Monthly income (RM)" value={income} onChange={setIncome} money placeholder="e.g. 6,000" />
        <Field label="Max budget (RM/mo)" value={budget} onChange={setBudget} money placeholder="e.g. 2,000" required />
        <Field label="Preferred bedrooms" value={beds} onChange={setBeds} type="number" placeholder="2" />
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>
            Move-in date <span style={{ color: "var(--kk-red)" }}>*</span>
          </label>
          <DateInput
            value={dmyToIso(moveIn)}
            onChange={(iso) => setMoveIn(isoToDMY(iso))}
            className="w-full text-[14px] px-3 py-2 rounded-xl"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            required
          />
        </div>
        <Field label="Number of occupants" value={occupants} onChange={setOccupants} type="number" placeholder="2" />
        <div className="col-span-2 flex items-center gap-6">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--kk-ink-soft)" }}>
            <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} /> Has pets
          </label>
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--kk-ink-soft)" }}>
            <input type="checkbox" checked={smoking} onChange={(e) => setSmoking(e.target.checked)} /> Smokes
          </label>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Notes</label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else relevant…"
          className="w-full text-[14px] px-3 py-2 rounded-xl"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", minHeight: 60 }}
        />
      </div>
      <div className="flex justify-end">
        <button type="button" className="kk-pill kk-pill-primary" onClick={handleSave} disabled={pending}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {pending ? "Saving…" : "Add to pack"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Pill({ bg, ink, children }: { bg?: string; ink?: string; children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full" style={{ background: bg ?? "var(--kk-surface-2)", color: ink ?? "var(--kk-ink-mute)" }}>
      {children}
    </span>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", full, required, money }: {
  label: string; value: string; onChange: (s: string) => void;
  placeholder?: string; type?: string; full?: boolean; required?: boolean; money?: boolean;
}) {
  const cls = "w-full text-[14px] px-3 py-2 rounded-xl";
  const sty = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>
        {label}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}
      </label>
      {money
        ? <MoneyInput value={value} onChange={onChange} placeholder={placeholder} className={cls} style={sty} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onWheel={type === "number" ? (e) => e.currentTarget.blur() : undefined} placeholder={placeholder} className={cls} style={sty} />
      }
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${d}, ${y}`;
  } catch { return iso; }
}

function isoToDMY(iso: string): string {
  if (!iso || !iso.match(/^\d{4}-\d{2}-\d{2}$/)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function dmyToIso(dmy: string): string {
  if (!dmy) return "";
  const parts = dmy.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  return "";
}
