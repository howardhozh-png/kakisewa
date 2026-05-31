"use client";

import { useState } from "react";
import { Plus, Copy, Check, ExternalLink, Edit2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Link {
  id: string;
  slug: string;
  label: string;
  created_at: string;
  sends: number;
  clicks: number;
  signups: number;
}

interface Funnel {
  total: number;
  trial: number;
  expired: number;
  active: number;
  unset: number;
}

function FunnelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "var(--kk-line)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 600ms ease" }} />
    </div>
  );
}

export function AdminView({ funnel, links: initialLinks }: { funnel: Funnel; links: Link[] }) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSends, setEditingSends] = useState<string | null>(null);
  const [sendsInput, setSendsInput] = useState("");

  function autoSlug(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreate() {
    if (!newLabel.trim() || !newSlug.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), slug: newSlug.trim() }),
    });
    if (res.ok) {
      const link = await res.json();
      setLinks(prev => [{ ...link, clicks: 0, signups: 0, sends: 0 }, ...prev]);
      setNewLabel("");
      setNewSlug("");
      toast.success("Link created");
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to create link");
    }
    setCreating(false);
  }

  async function saveSends(id: string) {
    const n = parseInt(sendsInput, 10);
    if (isNaN(n) || n < 0) return;
    const res = await fetch("/api/admin/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sends_count: n }),
    });
    if (res.ok) {
      setLinks(prev => prev.map(l => l.id === id ? { ...l, sends: n } : l));
      toast.success("Sends updated");
    } else {
      toast.error("Failed to update");
    }
    setEditingSends(null);
  }

  function copyLink(slug: string, id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/api/r/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const maxTotal = funnel.total || 1;
  const funnelStages = [
    { label: "Total accounts",    value: funnel.total,   color: "var(--kk-ink)" },
    { label: "Active trial",      value: funnel.trial,   color: "var(--kk-green)" },
    { label: "Expired trial",     value: funnel.expired, color: "#DC2626" },
    { label: "Paid subscribers",  value: funnel.active,  color: "#0071E3" },
    { label: "Legacy (no trial)", value: funnel.unset,   color: "var(--kk-ink-faint)" },
  ];

  return (
    <div className="px-6 lg:px-12 py-10 max-w-4xl mx-auto">
      <h1 className="serif mb-10" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
        Admin Dashboard
      </h1>

      {/* User Funnel */}
      <section className="mb-12">
        <p className="kk-overline mb-5">User Funnel</p>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
          {funnelStages.map((s, i) => (
            <div key={s.label} className="flex items-center gap-4 px-5 py-4" style={{ borderTop: i > 0 ? "1px solid var(--kk-line)" : "none", background: "var(--kk-surface)" }}>
              <div style={{ width: 52, flexShrink: 0 }}>
                <p className="tabular-nums font-bold" style={{ fontSize: "1.4rem", color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="mb-1.5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>{s.label}</p>
                <FunnelBar value={s.value} max={maxTotal} color={s.color} />
              </div>
              <div className="shrink-0" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", width: 36, textAlign: "right" }}>
                {funnel.total > 0 ? `${Math.round((s.value / funnel.total) * 100)}%` : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Outreach Links with WhatsApp funnel */}
      <section>
        <p className="kk-overline mb-2">Outreach Links</p>
        <p className="mb-5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
          Share these links in WhatsApp batches. Update the Sent count manually after each send. Clicked and Signed Up are tracked automatically.
        </p>

        {/* Create new */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <input
            value={newLabel}
            onChange={e => { setNewLabel(e.target.value); setNewSlug(autoSlug(e.target.value)); }}
            placeholder="Label (e.g. CoAgent May batch)"
            className="flex-1 min-w-[160px] rounded-xl px-3.5 py-2.5 outline-none"
            style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
          />
          <input
            value={newSlug}
            onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="slug"
            className="w-36 rounded-xl px-3.5 py-2.5 outline-none font-mono"
            style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newLabel.trim() || !newSlug.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-sm)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        {links.length === 0 ? (
          <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No links yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const clickRate = link.sends > 0 ? ((link.clicks / link.sends) * 100).toFixed(1) : "—";
              const convRate = link.clicks > 0 ? ((link.signups / link.clicks) * 100).toFixed(1) : "—";
              const maxVal = Math.max(link.sends, 1);

              return (
                <div key={link.id} className="rounded-2xl p-5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div>
                      <p className="font-semibold" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>{link.label}</p>
                      <p className="font-mono mt-0.5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>/api/r/{link.slug}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyLink(link.slug, link.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70"
                        style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", fontSize: "var(--kk-xs)", fontWeight: 500 }}
                      >
                        {copiedId === link.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === link.id ? "Copied" : "Copy link"}
                      </button>
                      <a
                        href={`/api/r/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70"
                        style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", fontSize: "var(--kk-xs)", fontWeight: 500 }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Test
                      </a>
                    </div>
                  </div>

                  {/* Funnel bars */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Sent */}
                    <div className="rounded-xl p-3" style={{ background: "var(--kk-surface-2)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Sent</p>
                        {editingSends === link.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={sendsInput}
                              onChange={e => setSendsInput(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveSends(link.id); if (e.key === "Escape") setEditingSends(null); }}
                              className="w-16 text-right rounded px-1 outline-none"
                              style={{ fontSize: "var(--kk-xs)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-surface)", color: "var(--kk-ink)" }}
                            />
                            <button onClick={() => saveSends(link.id)} style={{ fontSize: "var(--kk-xs)", color: "var(--kk-green)", fontWeight: 600 }}>✓</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingSends(link.id); setSendsInput(String(link.sends)); }}
                            className="flex items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity"
                            style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <p className="tabular-nums font-bold" style={{ fontSize: "1.3rem", color: "var(--kk-ink)", lineHeight: 1 }}>{link.sends}</p>
                      <FunnelBar value={link.sends} max={maxVal} color="var(--kk-ink)" />
                    </div>

                    {/* Clicked */}
                    <div className="rounded-xl p-3" style={{ background: "var(--kk-surface-2)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Clicked</p>
                        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>{clickRate}%</p>
                      </div>
                      <p className="tabular-nums font-bold" style={{ fontSize: "1.3rem", color: "#0071E3", lineHeight: 1 }}>{link.clicks}</p>
                      <FunnelBar value={link.clicks} max={maxVal} color="#0071E3" />
                    </div>

                    {/* Signed up */}
                    <div className="rounded-xl p-3" style={{ background: "var(--kk-surface-2)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Signed up</p>
                        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>{convRate}%</p>
                      </div>
                      <p className="tabular-nums font-bold" style={{ fontSize: "1.3rem", color: "var(--kk-green)", lineHeight: 1 }}>{link.signups}</p>
                      <FunnelBar value={link.signups} max={maxVal} color="var(--kk-green)" />
                    </div>
                  </div>

                  {/* Flow arrow */}
                  <div className="flex items-center gap-1.5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
                    <span>{link.sends > 0 ? `${link.sends} sent` : "No sends yet"}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>{link.clicks} clicked</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>{link.signups} signed up</span>
                    {link.sends > 0 && link.signups > 0 && (
                      <span style={{ marginLeft: 4, color: "var(--kk-green)", fontWeight: 600 }}>
                        ({((link.signups / link.sends) * 100).toFixed(1)}% end-to-end)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
