"use client";

import { useRef, useState } from "react";

type Seg = string | { t: string };

const PAINS: Array<{ segments: Seg[]; detail: string }> = [
  {
    segments: [
      "I forgot ",
      { t: "which contract is expiring" },
      " this month...",
    ],
    detail: "You find out only when the owner texts asking for a new tenant.",
  },
  {
    segments: [
      "So hard to ",
      { t: "match owner with tenant on WhatsApp" },
      "...",
    ],
    detail: "Copying photos, typing profiles. It still looks messy on their phone.",
  },
  {
    segments: [
      "I ",
      { t: "missed 2 contract renewals and 1 new lead" },
      " this month...",
    ],
    detail: "Leads pile up in WhatsApp. No follow up, no closure, no commission.",
  },
];

interface Badge { id: number; cardIdx: number; fading: boolean }

function renderSegments(segs: Seg[]) {
  return segs.map((s, i) =>
    typeof s === "string"
      ? s
      : <span key={i} style={{ color: "#DC2626" }}>{s.t}</span>
  );
}

export function PainCards() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const nextId = useRef(0);

  function handleClick(i: number) {
    const id = nextId.current++;
    setBadges(prev => [...prev, { id, cardIdx: i, fading: false }]);
    setTimeout(() => setBadges(prev => prev.map(b => b.id === id ? { ...b, fading: true } : b)), 600);
    setTimeout(() => setBadges(prev => prev.filter(b => b.id !== id)), 1000);
  }

  return (
    <>
      <style>{`
        @keyframes kk-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15%       { transform: translateX(-5px) rotate(-2deg); }
          30%       { transform: translateX(5px) rotate(2deg); }
          45%       { transform: translateX(-4px) rotate(-1.5deg); }
          60%       { transform: translateX(4px) rotate(1.5deg); }
          75%       { transform: translateX(-2px) rotate(-0.5deg); }
          90%       { transform: translateX(2px) rotate(0.5deg); }
        }
        @keyframes kk-badge-pop {
          0%   { transform: scale(0); opacity: 0; }
          40%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="grid lg:grid-cols-3 gap-6">
        {PAINS.map((p, i) => {
          const isHovered = hoveredIdx === i;
          const cardBadges = badges.filter(b => b.cardIdx === i);
          const key = p.segments.map(s => typeof s === "string" ? s : s.t).join("");
          return (
            <div
              key={key}
              className="relative cursor-pointer select-none"
              style={{ animation: isHovered ? "kk-shake 0.5s ease-in-out" : "none" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleClick(i)}
            >
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "#fff",
                  boxShadow: isHovered ? "0 8px 30px rgba(0,0,0,0.12)" : "0 2px 16px rgba(0,0,0,0.07)",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                <p className="serif font-semibold mb-3" style={{ fontSize: "var(--kk-h2)", color: "var(--kk-ink)", lineHeight: 1.3 }}>
                  &ldquo;{renderSegments(p.segments)}&rdquo;
                </p>
                <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                  {p.detail}
                </p>
              </div>

              <div
                style={{
                  position: "absolute", bottom: -9, left: 24,
                  width: 18, height: 18, background: "#fff",
                  transform: "rotate(45deg)", boxShadow: "3px 3px 6px rgba(0,0,0,0.06)", zIndex: -1,
                }}
              />

              {cardBadges.map(badge => (
                <div
                  key={badge.id}
                  className="absolute flex items-center justify-center font-bold pointer-events-none"
                  style={{
                    top: -14, right: -14, width: 36, height: 36, borderRadius: "50%",
                    background: "#34C759", color: "#fff", fontSize: 14,
                    boxShadow: "0 2px 8px rgba(52,199,89,0.4)",
                    opacity: badge.fading ? 0 : 1,
                    transition: badge.fading ? "opacity 0.4s ease" : "none",
                    animation: badge.fading ? "none" : "kk-badge-pop 0.25s ease-out",
                  }}
                >
                  +1
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
