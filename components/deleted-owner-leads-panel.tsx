"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { restoreOwnerLeadAction, hardDeleteOwnerLeadAction } from "@/lib/actions";
import type { OwnerLead } from "@/lib/types";

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DeletedOwnerLeadsPanel({ leads }: { leads: OwnerLead[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [hardDeletingId, setHardDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (leads.length === 0) return null;

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await restoreOwnerLeadAction(id);
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  }

  async function handleHardDelete(id: string) {
    setHardDeletingId(id);
    try {
      await hardDeleteOwnerLeadAction(id);
      setConfirmId(null);
      router.refresh();
    } finally {
      setHardDeletingId(null);
    }
  }

  return (
    <div className="mt-6 mx-auto max-w-[1440px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium w-full transition-opacity hover:opacity-70"
        style={{ color: "var(--kk-ink-mute)", background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
      >
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        Deleted ({leads.length})
        <span className="ml-1 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          — auto-deleted after 7 days
        </span>
      </button>

      {open && (
        <div className="kk-section mt-2 overflow-hidden p-0">
          {leads.map((lead, i) => {
            const isLast = i === leads.length - 1;
            const isConfirming = confirmId === lead.id;
            return (
              <div
                key={lead.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: isLast ? "none" : "1px solid var(--kk-line)",
                  opacity: 0.65,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate line-through" style={{ color: "var(--kk-ink)" }}>
                    {lead.owner_name ?? "Unknown owner"}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                    {lead.property_name ?? lead.address ?? "—"}
                  </p>
                </div>
                <p className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-faint)" }}>
                  {lead.deleted_at ? `Deleted ${relativeTime(lead.deleted_at)}` : ""}
                </p>
                {!isConfirming ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={restoringId === lead.id}
                      onClick={() => handleRestore(lead.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)" }}
                    >
                      {restoringId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(lead.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: "rgba(255,59,48,0.10)", color: "#FF3B30" }}
                      title="Delete forever"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={hardDeletingId === lead.id}
                      onClick={() => handleHardDelete(lead.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                      style={{ background: "#FF3B30", color: "#fff" }}
                    >
                      {hardDeletingId === lead.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      Delete forever
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
