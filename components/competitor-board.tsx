"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OwnerLead, CompetitorStage, daysUntil } from "@/lib/types";
import { setCompetitorStageAction, winCompetitorUnitAction } from "@/lib/actions";
import { Home, User, Calendar, Eye, Phone, CheckCircle2, XCircle, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { AddCompetitorDialog } from "@/components/add-competitor-dialog";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColMeta {
  stage: CompetitorStage;
  label: string;
  hint: string;
  dot: string;
  soft: string;
  ink: string;
}

const COLUMNS: ColMeta[] = [
  { stage: "watching",   label: "Watching",   hint: "Tracking — you'll be moved to Reach out at 60 days.", dot: "var(--kk-ink-faint)", soft: "var(--kk-surface-2)", ink: "var(--kk-ink-mute)" },
  { stage: "reach_out",  label: "Reach out",  hint: "Within 60 days. Contact the owner now before the renewal.",  dot: "#B45309",            soft: "rgba(251,191,36,0.10)", ink: "#B45309"             },
  { stage: "in_talks",   label: "In talks",   hint: "Owner is interested. Keep the conversation going.",          dot: "var(--kk-theme-dark)", soft: "var(--kk-theme-light)", ink: "var(--kk-theme-dark)" },
];

const TERMINAL: ColMeta[] = [
  { stage: "missed", label: "Missed", hint: "Didn't get it this time.", dot: "var(--kk-ink-faint)", soft: "var(--kk-surface-2)", ink: "var(--kk-ink-faint)" },
];

// Compute effective display stage: auto-promote to reach_out if ≤ 60 days and still on watching
function effectiveStage(lead: OwnerLead, today: Date): CompetitorStage {
  const stored = lead.competitor_stage ?? "watching";
  if (stored === "watching" && lead.competitor_contract_end) {
    const days = daysUntil(lead.competitor_contract_end, today);
    if (days <= 60) return "reach_out";
  }
  return stored as CompetitorStage;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} '${String(y).slice(2)}`;
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface Props {
  leads: OwnerLead[];
}

export function CompetitorBoard({ leads }: Props) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [local, setLocal] = useState<OwnerLead[]>(leads);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { setLocal(leads); }, [leads]);

  const byStage = useMemo(() => {
    const map: Record<CompetitorStage, OwnerLead[]> = { watching: [], reach_out: [], in_talks: [], missed: [] };
    local.forEach(l => { map[effectiveStage(l, today)].push(l); });
    return map;
  }, [local, today]);

  async function handleSetStage(id: string, stage: CompetitorStage) {
    setLocal(prev => prev.map(l => l.id === id ? { ...l, competitor_stage: stage } : l));
    await setCompetitorStageAction(id, stage);
    router.refresh();
  }

  async function handleWin(id: string) {
    setLocal(prev => prev.filter(l => l.id !== id));
    await winCompetitorUnitAction(id);
    toast.success("Won! Card moved to My listing.");
    router.refresh();
  }

  const activeColumns = [...COLUMNS, ...TERMINAL];
  const totalActive = (byStage.watching.length + byStage.reach_out.length + byStage.in_talks.length);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
          {totalActive} unit{totalActive !== 1 ? "s" : ""} tracked
        </p>
        <button
          onClick={() => setAddOpen(true)}
          className="kk-pill kk-pill-white flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add target
        </button>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1" style={{ minHeight: 0 }}>
        {activeColumns.map(col => (
          <Column
            key={col.stage}
            col={col}
            leads={byStage[col.stage]}
            today={today}
            onSetStage={handleSetStage}
            onWin={handleWin}
          />
        ))}
      </div>

      <AddCompetitorDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ col, leads, today, onSetStage, onWin }: {
  col: ColMeta;
  leads: OwnerLead[];
  today: Date;
  onSetStage: (id: string, stage: CompetitorStage) => void;
  onWin: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 shrink-0 rounded-2xl p-3"
      style={{ width: 280, background: col.soft, border: `1.5px solid color-mix(in srgb, ${col.dot} 18%, transparent)`, minHeight: 120 }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-0.5 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: col.ink }}>{col.label}</span>
        <span className="ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: col.ink }}>
          {leads.length}
        </span>
      </div>
      {leads.length === 0 && (
        <p className="text-[11px] px-1 py-2" style={{ color: "var(--kk-ink-faint)" }}>{col.hint}</p>
      )}
      {leads.map(l => (
        <CompetitorCard key={l.id} lead={l} col={col} today={today} onSetStage={onSetStage} onWin={onWin} />
      ))}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CompetitorCard({ lead, col, today, onSetStage, onWin }: {
  lead: OwnerLead;
  col: ColMeta;
  today: Date;
  onSetStage: (id: string, stage: CompetitorStage) => void;
  onWin: (id: string) => void;
}) {
  const days = lead.competitor_contract_end ? daysUntil(lead.competitor_contract_end, today) : null;
  const daysBg    = days === null ? "var(--kk-surface-2)" : days < 0 ? "var(--kk-surface-2)" : days <= 30 ? "var(--kk-red-soft)" : days <= 60 ? "var(--kk-amber-soft)" : "var(--kk-surface-2)";
  const daysColor = days === null ? "var(--kk-ink-faint)" : days < 0 ? "var(--kk-ink-mute)" : days <= 30 ? "#C62828" : days <= 60 ? "#B45309" : "var(--kk-ink-mute)";
  const daysLabel = days === null ? "—" : days < 0 ? `${Math.abs(days)}d over` : days === 0 ? "Today" : `${days}d`;

  const photo = lead.photo_urls?.[lead.cover_photo_index ?? 0] ?? lead.photo_urls?.[0];
  const waUrl = lead.owner_phone
    ? `https://wa.me/${lead.owner_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${lead.owner_name ?? "there"}, I'm interested in your unit at ${lead.property_name ?? "your property"}. Are you open to discussing new tenancy arrangements?`)}`
    : null;

  return (
    <div className="kk-card p-3 flex flex-col gap-2.5" style={{ background: "var(--kk-bg)", cursor: "default" }}>
      {/* Photo + main info */}
      <div className="flex gap-2.5">
        <div className="w-[56px] h-[56px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <Home className="w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)" }}>
              {lead.property_name ?? "—"}
            </p>
            {days !== null && (
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: daysBg, color: daysColor }}>
                {daysLabel}
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: "var(--kk-ink-soft)" }}>
            {lead.unit && <span>{lead.unit} · </span>}
            {lead.expected_rent
              ? <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {lead.expected_rent.toLocaleString()}/mo</span>
              : <span style={{ color: "var(--kk-ink-faint)" }}>Rent unknown</span>}
            {(lead.bedrooms != null || lead.bathrooms != null) && (
              <span style={{ color: "var(--kk-ink-faint)" }}>
                {" · "}
                {lead.bedrooms != null ? `${lead.bedrooms}bd` : ""}
                {lead.bedrooms != null && lead.bathrooms != null ? " " : ""}
                {lead.bathrooms != null ? `${lead.bathrooms}ba` : ""}
              </span>
            )}
          </p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>
                {lead.owner_name ?? "Owner unknown"}
              </p>
            </div>
            {lead.competitor_contract_end && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Calendar className="w-2.5 h-2.5" style={{ color: "var(--kk-ink-faint)" }} />
                <span className="text-[10px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                  {formatDate(lead.competitor_contract_end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {col.stage !== "missed" && (
        <div className="flex gap-1.5 flex-wrap">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(37,211,102,0.10)", color: "#1a7a40" }}
              onClick={() => {
                if (col.stage === "watching" || col.stage === "reach_out") {
                  onSetStage(lead.id, "in_talks");
                }
              }}
            >
              <WhatsAppIcon className="w-3 h-3" />
              Text owner
            </a>
          )}
          {col.stage === "reach_out" && (
            <button
              onClick={() => onSetStage(lead.id, "in_talks")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "var(--kk-theme-light)", color: "var(--kk-theme-dark)" }}
            >
              <Phone className="w-3 h-3" />
              Mark contacted
            </button>
          )}
          {col.stage === "in_talks" && (
            <button
              onClick={() => onWin(lead.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(52,199,89,0.12)", color: "#1F8B4C" }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Won — add to My listing
            </button>
          )}
          {(col.stage === "reach_out" || col.stage === "in_talks") && (
            <button
              onClick={() => onSetStage(lead.id, "missed")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
            >
              <XCircle className="w-3 h-3" />
              Missed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
