"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Bed, Bath, MapPin, Calendar, Loader2 } from "lucide-react";
import type { OwnerLead } from "@/lib/types";
import { Logo } from "@/components/logo";

interface Props {
  lead: OwnerLead;
  propertyToken: string;
  agentName: string | null;
  agentAgency: string | null;
}

export function PropertyPackClient({ lead, propertyToken, agentName, agentAgency }: Props) {
  const photos: string[] = lead.photo_urls ?? [];
  const coverIdx = lead.cover_photo_index ?? 0;
  const orderedPhotos = photos.length > 0
    ? [photos[coverIdx], ...photos.filter((_, i) => i !== coverIdx)]
    : [];

  const [photoIdx, setPhotoIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function handleInterested() {
    setLoading(true);
    try {
      const res = await fetch("/api/property-pack/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyToken }),
      });
      const data = await res.json() as { ok: boolean; intakeUrl?: string };
      if (data.ok && data.intakeUrl) {
        setRedirecting(true);
        window.location.href = data.intakeUrl;
      }
    } catch {
      setLoading(false);
    }
  }

  const displayName = agentName?.trim().split(/\s+/)[0] ?? "Your agent";
  const agency = agentAgency ?? "kakisewa";

  return (
    <div className="min-h-dvh" style={{ background: "#F2F2F7", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 10 }}>
        <div className="mx-auto max-w-[600px] px-5 py-3 flex items-center gap-2.5">
          <Logo size={22} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "#1C1C1E", letterSpacing: "-0.01em" }}>kakisewa</span>
          <span style={{ marginLeft: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "#AEAEB2" }}>
            Property details
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-5 pb-32 space-y-4">

        {/* Photo carousel */}
        {orderedPhotos.length > 0 ? (
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "16/9", background: "#E5E5EA" }}>
            <img
              src={orderedPhotos[photoIdx]}
              alt={`${lead.property_name ?? "Property"} photo ${photoIdx + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {orderedPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + orderedPhotos.length) % orderedPhotos.length)}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} color="#fff" />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % orderedPhotos.length)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} color="#fff" />
                </button>
                <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
                  {orderedPhotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      style={{ width: i === photoIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.5)", border: "none", padding: 0, cursor: "pointer", transition: "width 0.2s" }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 16, aspectRatio: "16/9", background: "#E5E5EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "#AEAEB2" }}>No photos yet</span>
          </div>
        )}

        {/* Property title */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AEAEB2", marginBottom: 4 }}>
            {displayName} from {agency}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.015em", lineHeight: 1.3, marginBottom: 4 }}>
            {lead.property_name ?? "Property"}
            {lead.unit && <span style={{ fontWeight: 400, color: "#6E6E73" }}> · Unit {lead.unit}</span>}
          </h1>
          {lead.expected_rent != null && (
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0071E3", letterSpacing: "-0.01em" }}>
              RM {lead.expected_rent.toLocaleString()}<span style={{ fontSize: 13, fontWeight: 400, color: "#6E6E73" }}>/mo</span>
            </p>
          )}
        </div>

        {/* Stats */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
          {lead.bedrooms != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Bed size={16} color="#6E6E73" />
              <span style={{ fontSize: 14, color: "#1C1C1E", fontWeight: 500 }}>{lead.bedrooms} Bedroom{lead.bedrooms !== 1 ? "s" : ""}</span>
            </div>
          )}
          {lead.bathrooms != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Bath size={16} color="#6E6E73" />
              <span style={{ fontSize: 14, color: "#1C1C1E", fontWeight: 500 }}>{lead.bathrooms} Bathroom{lead.bathrooms !== 1 ? "s" : ""}</span>
            </div>
          )}
          {lead.available_from && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={16} color="#6E6E73" />
              <span style={{ fontSize: 14, color: "#1C1C1E", fontWeight: 500 }}>
                Available {new Date(lead.available_from).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}
          {lead.address && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
              <MapPin size={16} color="#6E6E73" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, color: "#1C1C1E", fontWeight: 500 }}>{lead.address}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {lead.notes && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AEAEB2", marginBottom: 8 }}>About this property</p>
            <p style={{ fontSize: 14, color: "#3A3A3C", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lead.notes}</p>
          </div>
        )}

        {/* Agent card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E5E5EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#6E6E73" }}>{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1E" }}>{agentName ?? displayName}</p>
            <p style={{ fontSize: 12, color: "#AEAEB2" }}>{agency}</p>
          </div>
        </div>

      </main>

      {/* Sticky CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px 28px", background: "linear-gradient(to top, #F2F2F7 70%, transparent)", pointerEvents: "none" }}>
        <div className="mx-auto max-w-[600px]" style={{ pointerEvents: "auto" }}>
          <button
            onClick={handleInterested}
            disabled={loading || redirecting}
            style={{
              width: "100%",
              padding: "15px 24px",
              borderRadius: 14,
              background: loading || redirecting ? "#555" : "#1C1C1E",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: loading || redirecting ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: "-0.01em",
            }}
          >
            {(loading || redirecting) && <Loader2 size={16} className="animate-spin" />}
            {redirecting ? "Opening form..." : loading ? "Please wait..." : "I'm interested — tell me more"}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#8E8E93", marginTop: 8 }}>
            Takes about 2 minutes. No login needed.
          </p>
        </div>
      </div>
    </div>
  );
}
