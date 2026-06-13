"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bed, Bath, Square, Send, Home,
  Loader2, Copy, Check, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { PropertyPackLead } from "@/lib/db";

interface Tenant { id: string; name: string; phone: string | null }

function buildWaMessage(tenant: Tenant, selected: PropertyPackLead[], shareUrl: string): string {
  const header = `Hi ${tenant.name}, here are some properties I've selected for you:\n\n`;
  const body = selected.map((l, i) => {
    const lines: string[] = [];
    lines.push(`${i + 1}. ${l.property_name ?? "Property"}${l.unit ? ` – Unit ${l.unit}` : ""}`);
    const details: string[] = [];
    if (l.bedrooms != null) details.push(`${l.bedrooms} bed`);
    if (l.bathrooms != null) details.push(`${l.bathrooms} bath`);
    if (details.length) lines.push(`   ${details.join("  |  ")}`);
    if (l.expected_rent) lines.push(`   RM ${l.expected_rent.toLocaleString()}/mo`);
    return lines.join("\n");
  }).join("\n\n");
  return header + body + `\n\nView the full pack with photos here:\n${shareUrl}\n\nLet me know which ones you'd like to view!`;
}

function PropertyCard({
  lead, selected, onToggle,
}: { lead: PropertyPackLead; selected: boolean; onToggle: () => void }) {
  const coverUrl = lead.photo_urls[lead.cover_photo_index ?? 0] ?? lead.photo_urls[0] ?? null;
  return (
    <button
      onClick={onToggle}
      className="flex flex-col overflow-hidden rounded-2xl text-left w-full transition-all duration-150"
      style={{
        border: selected ? "2px solid var(--kk-green)" : "2px solid var(--kk-line)",
        background: selected ? "color-mix(in srgb, var(--kk-green) 6%, var(--kk-surface))" : "var(--kk-surface)",
        boxShadow: selected ? "0 4px 16px color-mix(in srgb, var(--kk-green) 22%, transparent)" : "none",
      }}
    >
      <div className="relative w-full" style={{ paddingBottom: "56.25%", background: "var(--kk-line)" }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Property" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Home className="w-8 h-8" style={{ color: "var(--kk-ink-faint)" }} />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {selected
            ? (
              <div className="w-6 h-6 rounded-md flex items-center justify-center drop-shadow"
                style={{ background: "var(--kk-green)" }}>
                <Check className="w-4 h-4" style={{ color: "#fff", strokeWidth: 3 }} />
              </div>
            )
            : <Square className="w-6 h-6 drop-shadow" style={{ color: "#fff" }} />}
        </div>
      </div>
      <div className="p-4">
        <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--kk-ink)" }}>
          {lead.property_name ?? "—"}
        </p>
        {lead.unit && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>Unit {lead.unit}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {lead.bedrooms != null && (
            <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
              <Bed className="w-3.5 h-3.5" /> {lead.bedrooms}
            </span>
          )}
          {lead.bathrooms != null && (
            <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
              <Bath className="w-3.5 h-3.5" /> {lead.bathrooms}
            </span>
          )}
          {lead.expected_rent != null && (
            <span className="text-[12px] font-semibold ml-auto" style={{ color: "var(--kk-ink)" }}>
              RM {lead.expected_rent.toLocaleString()}/mo
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function PropertyPackBuilder({ tenant, leads }: { tenant: Tenant; leads: PropertyPackLead[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [packUrl, setPackUrl] = useState<string | null>(null);
  const [packDirty, setPackDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (packUrl) setPackDirty(true);
  }

  const filtered = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.property_name ?? "").toLowerCase().includes(q) ||
      (l.unit ?? "").toLowerCase().includes(q)
    );
  });

  const selectedLeads = leads.filter(l => selected.has(l.id));

  async function generateLink(): Promise<string | null> {
    if (selectedLeads.length === 0 || generating) return null;
    setGenerating(true);
    try {
      const res = await fetch("/api/property-pack/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantPhone: tenant.phone,
          leads: selectedLeads,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json() as { url: string };
      setPackUrl(url);
      setPackDirty(false);
      return url;
    } catch {
      toast.error("Could not create property pack. Try again.");
      return null;
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!tenant.phone || selectedLeads.length === 0) return;
    const url = (packUrl && !packDirty) ? packUrl : await generateLink();
    if (!url) return;
    const phone = tenant.phone.replace(/\D/g, "").replace(/^0/, "60");
    const msg = buildWaMessage(tenant, selectedLeads, url);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  function handleCopy() {
    if (!packUrl) return;
    navigator.clipboard.writeText(packUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/directory?view=tenants"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--kk-line)", color: "var(--kk-ink-mute)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-ink-faint)" }}>
            Property pack
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--kk-ink)" }}>
              {tenant.name}
            </h1>
            {selected.size > 0 && (
              <span
                className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--kk-accent) 12%, var(--kk-surface))", color: "var(--kk-accent)" }}
              >
                {selected.size} of {leads.length} selected
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[13px] mb-6 mt-1 ml-11" style={{ color: "var(--kk-ink-mute)" }}>
        Select properties to send. Owner details are not included.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left: property cards */}
        <div>
          <div className="relative mb-5">
            <input
              type="text"
              placeholder="Search by property or unit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-[14px] px-4 py-2.5 rounded-2xl outline-none"
              style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[14px]" style={{ color: "var(--kk-ink-faint)" }}>
                {leads.length === 0 ? "No listed properties yet. Add listings in My Listing." : "No properties match your search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-28 lg:pb-4">
              {filtered.map(l => (
                <PropertyCard
                  key={l.id}
                  lead={l}
                  selected={selected.has(l.id)}
                  onToggle={() => toggle(l.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Share with Tenant panel */}
        <aside className="space-y-4">
          <section className="kk-section p-5">
            <p className="kk-overline mb-3">Share with tenant</p>
            <p className="text-[13px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>
              Anyone with this link can view the selected properties. Valid for 1 hour.
            </p>

            {/* Link box */}
            <div
              className="rounded-xl px-3 py-2.5 text-[12px] font-mono break-all mb-3"
              style={{
                background: "var(--kk-surface-2)",
                border: "1px solid var(--kk-line)",
                color: packUrl && !packDirty ? "var(--kk-ink-soft)" : "var(--kk-ink-faint)",
                opacity: packDirty ? 0.5 : 1,
              }}
            >
              {packUrl
                ? packUrl
                : selected.size === 0
                ? "Select at least 1 property to generate a link"
                : "Click below to generate a share link"}
            </div>

            {packDirty && (
              <p className="text-[11px] mb-2" style={{ color: "var(--kk-orange, #FF9500)" }}>
                Selection changed — regenerate to update the link
              </p>
            )}

            {/* Primary action */}
            {!packUrl || packDirty ? (
              <button
                onClick={generateLink}
                disabled={selected.size === 0 || generating}
                className="kk-pill kk-pill-primary w-full justify-center mb-2"
                style={{ padding: "0.6rem 1rem" }}
              >
                {generating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : packDirty ? "Regenerate link" : "Generate link"}
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!tenant.phone || generating}
                className="kk-pill kk-pill-primary w-full justify-center mb-2"
                style={{ padding: "0.6rem 1rem" }}
              >
                {generating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening WhatsApp…</>
                  : <><Send className="w-3.5 h-3.5" /> Send to tenant via WhatsApp</>}
              </button>
            )}

            {/* Copy + Preview */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!packUrl || packDirty}
                className="kk-pill kk-pill-ghost flex-1 justify-center"
                style={{ opacity: !packUrl || packDirty ? 0.4 : 1 }}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
              </button>
              {packUrl && !packDirty ? (
                <a
                  href={packUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kk-pill kk-pill-ghost"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </a>
              ) : (
                <button
                  disabled
                  className="kk-pill kk-pill-ghost"
                  style={{ opacity: 0.4 }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Mobile-only bottom bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-4 py-4"
        style={{ background: "var(--kk-surface)", borderTop: "1px solid var(--kk-line)", zIndex: 40 }}
      >
        <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
          {selected.size === 0
            ? "Select at least 1 property"
            : `${selected.size} propert${selected.size === 1 ? "y" : "ies"} selected`}
        </p>
        <button
          onClick={handleSend}
          disabled={selected.size === 0 || !tenant.phone || generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold"
          style={{
            background: selected.size > 0 && tenant.phone && !generating ? "#25D366" : "var(--kk-line)",
            color: selected.size > 0 && tenant.phone && !generating ? "#fff" : "var(--kk-ink-faint)",
            transition: "background 0.15s ease",
          }}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {tenant.phone ? (generating ? "Creating…" : "Send via WhatsApp") : "No phone on file"}
        </button>
      </div>
    </div>
  );
}
