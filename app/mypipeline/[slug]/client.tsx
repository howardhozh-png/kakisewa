"use client";

import { useState, useRef, useEffect } from "react";
import type { OwnerLead } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  agentName: string;
  isVerified: boolean;
  leads: OwnerLead[];
}

// ── Passcode Gate ─────────────────────────────────────────────────────────────

function PasscodeGate({ slug, agentName }: { slug: string; agentName: string }) {
  const [digits, setDigits] = useState<string[]>(Array(8).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passcode = digits.join("");

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits]; next[i] = "";
        setDigits(next);
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
      }
    }
  }

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = digit;
    setDigits(next);
    if (digit && i < 7) inputRefs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (!text) return;
    e.preventDefault();
    const next = Array(8).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputRefs.current[Math.min(text.length, 7)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode.length < 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/board/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, passcode }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const { error } = await res.json();
        setError(error === "Wrong passcode" ? "Incorrect passcode. Try again." : "Something went wrong.");
        setDigits(Array(8).fill(""));
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--kk-bg, #FBFBFD)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 32px", width: "100%", maxWidth: 380, textAlign: "center", boxShadow: "0 4px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E5EA" }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 28, color: "#1D1D1F" }}>kakisewa</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, color: "#1D1D1F" }}>{agentName}&apos;s listings</div>
        <div style={{ fontSize: 14, color: "#6E6E73", marginBottom: 32, lineHeight: 1.5 }}>Enter the 8-digit passcode to view these listings.</div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 28 }} onPaste={handlePaste}>
            {Array(8).fill(0).map((_, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                onFocus={e => e.target.select()}
                style={{
                  width: 36, height: 44, textAlign: "center", fontSize: 20, fontWeight: 700,
                  border: `1.5px solid ${error ? "#FF3B30" : digits[i] ? "#0071E3" : "#E5E5EA"}`,
                  borderRadius: 10, background: digits[i] ? "#fff" : "#F9F9FB",
                  color: "#1D1D1F", outline: "none", caretColor: "transparent",
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#FF3B30", marginBottom: 16, fontWeight: 500 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={passcode.length < 8 || loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 14,
              background: passcode.length === 8 ? "#0071E3" : "#E5E5EA",
              color: passcode.length === 8 ? "#fff" : "#8E8E93",
              fontSize: 15, fontWeight: 600, border: "none", cursor: passcode.length === 8 ? "pointer" : "default",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {loading ? "Verifying…" : "View listings"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Card Detail Sheet ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRent(n: number | null | undefined): string {
  if (!n) return "TBC";
  return `RM ${n.toLocaleString()}/mo`;
}

function CardSheet({ lead, onClose }: { lead: OwnerLead; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const photos = lead.photo_urls ?? [];
  const coverIdx = lead.cover_photo_index ?? 0;
  const ordered = photos.length > 1
    ? [photos[coverIdx], ...photos.filter((_, i) => i !== coverIdx)]
    : photos;

  const [photoIdx, setPhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const detailText = [
    lead.address ?? `${lead.property_name ?? ""}${lead.unit ? `, ${lead.unit}` : ""}`,
    [
      lead.bedrooms != null ? `${lead.bedrooms} bed` : null,
      lead.bathrooms != null ? `${lead.bathrooms} bath` : null,
      lead.parking ? `${lead.parking} parking` : null,
    ].filter(Boolean).join(" | "),
    `Asking: ${fmtRent(lead.expected_rent)}`,
    lead.available_from ? `Available: ${fmtDate(lead.available_from)}` : null,
  ].filter(Boolean).join("\n");

  function copy() {
    navigator.clipboard.writeText(detailText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function downloadAll() {
    if (ordered.length === 0) return;
    setDownloading(true);
    const slug = `${lead.property_name ?? "property"}${lead.unit ? `-${lead.unit}` : ""}`.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    for (let i = 0; i < ordered.length; i++) {
      try {
        const res = await fetch(ordered[i]);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-photo-${i + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (i < ordered.length - 1) await new Promise(r => setTimeout(r, 400));
      } catch { /* skip failed photo */ }
    }
    setDownloading(false);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "92svh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Photo gallery */}
        <div style={{ position: "relative", height: 240, background: "#E5E5EA", flexShrink: 0 }}>
          {ordered.length > 0 ? (
            <img src={ordered[photoIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}

          {/* Nav arrows */}
          {ordered.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx(i => (i - 1 + ordered.length) % ordered.length)}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                ‹
              </button>
              <button onClick={() => setPhotoIdx(i => (i + 1) % ordered.length)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                ›
              </button>
            </>
          )}

          {/* Dots */}
          {ordered.length > 1 && (
            <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {ordered.map((_, i) => (
                <div key={i} onClick={() => setPhotoIdx(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer" }} />
              ))}
            </div>
          )}

          {/* Photo count */}
          {ordered.length > 0 && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, backdropFilter: "blur(4px)" }}>
              {photoIdx + 1} / {ordered.length}
            </div>
          )}

          {/* Close */}
          <button onClick={onClose}
            style={{ position: "absolute", top: 10, left: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 20px 32px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
            {lead.property_name ?? "Property"}
          </div>
          <div style={{ fontSize: 14, color: "#6E6E73", marginBottom: 20 }}>
            {[lead.unit, lead.address].filter(Boolean).join(" · ")}
          </div>

          {/* Detail grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Asking rent", val: fmtRent(lead.expected_rent), accent: true },
              { label: "Available", val: lead.available_from ? fmtDate(lead.available_from) : "TBC" },
              { label: "Bedrooms", val: lead.bedrooms != null ? `${lead.bedrooms}` : "TBC" },
              { label: "Bathrooms", val: lead.bathrooms != null ? `${lead.bathrooms}` : "TBC" },
              { label: "Parking", val: lead.parking ?? "TBC" },
            ].map(({ label, val, accent }) => (
              <div key={label} style={{ background: "#F9F9FB", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8E8E93", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: accent ? 17 : 15, fontWeight: 600, color: accent ? "#0071E3" : "#1D1D1F" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Copy preview */}
          <div style={{ background: "#F9F9FB", borderRadius: 12, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#6E6E73", lineHeight: 1.7, border: "1px dashed #D1D1D6", whiteSpace: "pre-wrap", marginBottom: 16 }}>
            {detailText}
          </div>

          {/* Copy button */}
          <button onClick={copy}
            style={{ width: "100%", padding: 15, borderRadius: 14, background: copied ? "#34C759" : "#0071E3", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s", marginBottom: 10 }}>
            {copied ? "✓ Copied!" : "Copy listing details"}
          </button>

          {/* Download photos button */}
          {ordered.length > 0 && (
            <button onClick={downloadAll} disabled={downloading}
              style={{ width: "100%", padding: 15, borderRadius: 14, background: downloading ? "#F2F2F7" : "#F2F2F7", color: downloading ? "#8E8E93" : "#1D1D1F", fontSize: 15, fontWeight: 600, border: "1.5px solid #E5E5EA", cursor: downloading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {downloading ? `Downloading ${ordered.length} photo${ordered.length > 1 ? "s" : ""}…` : `Download all photos (${ordered.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Board View ─────────────────────────────────────────────────────────────────

function BoardView({ leads, agentName }: { leads: OwnerLead[]; agentName: string }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OwnerLead | null>(null);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return !q || (l.property_name ?? "").toLowerCase().includes(q) || (l.unit ?? "").toLowerCase().includes(q) || (l.address ?? "").toLowerCase().includes(q);
  }).sort((a, b) => {
    if (!a.available_from && !b.available_from) return 0;
    if (!a.available_from) return 1;
    if (!b.available_from) return -1;
    return a.available_from.localeCompare(b.available_from);
  });

  return (
    <div style={{ minHeight: "100svh", background: "#FBFBFD" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E5EA", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{agentName}&apos;s listings</div>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: "rgba(255,149,0,0.10)", color: "#92400E" }}>Read only</span>
        </div>
        <div style={{ fontSize: 12, color: "#6E6E73" }}>{leads.length} {leads.length === 1 ? "property" : "properties"} available</div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F2F2F7", borderRadius: 10, padding: "9px 12px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by property name or unit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 14, color: "#1D1D1F", width: "100%", outline: "none" }}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#8E8E93", fontSize: 14 }}>
          {search ? "No properties match your search." : "No listed properties yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: "0 16px 32px" }}>
          {filtered.map(lead => {
            const photos = lead.photo_urls ?? [];
            const cover = photos[(lead.cover_photo_index ?? 0) % Math.max(photos.length, 1)];
            return (
              <div
                key={lead.id}
                onClick={() => setSelected(lead)}
                style={{ background: "#fff", borderRadius: 18, border: "1px solid #E5E5EA", overflow: "hidden", cursor: "pointer" }}
              >
                {/* Cover photo */}
                <div style={{ height: 200, background: "#E5E5EA", position: "relative", overflow: "hidden" }}>
                  {cover ? (
                    <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  {photos.length > 1 && (
                    <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, backdropFilter: "blur(4px)" }}>
                      {photos.length} photos
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: "14px 16px 16px" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{lead.property_name ?? "Property"}</div>
                  <div style={{ fontSize: 13, color: "#6E6E73", marginBottom: 12 }}>{[lead.unit, lead.address].filter(Boolean).join(" · ")}</div>

                  {/* Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {lead.bedrooms != null && <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: "#F2F2F7", color: "#1D1D1F" }}>{lead.bedrooms} bed</span>}
                    {lead.bathrooms != null && <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: "#F2F2F7", color: "#1D1D1F" }}>{lead.bathrooms} bath</span>}
                    {lead.parking && <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: "#F2F2F7", color: "#1D1D1F" }}>{lead.parking} parking</span>}
                    {lead.available_from && <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: "#F2F2F7", color: "#1D1D1F" }}>Avail {fmtDate(lead.available_from)}</span>}
                  </div>

                  {/* Rent */}
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F" }}>
                    {lead.expected_rent ? <>RM {lead.expected_rent.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: "#6E6E73" }}>/mo</span></> : "TBC"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <CardSheet lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function PipelineBoardClient({ slug, agentName, isVerified, leads }: Props) {
  if (!isVerified) return <PasscodeGate slug={slug} agentName={agentName} />;
  return <BoardView leads={leads} agentName={agentName} />;
}
