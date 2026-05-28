"use client";

import { Bell, Share2, Wrench, BarChart3, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

function MockContractExpiry() {
  const rows = [
    { name: "Desa ParkCity", owner: "Encik Razali", unit: "A-12-3", days: 8 },
    { name: "Mont Kiara Suites", owner: "Puan Hafizah", unit: "B-5-1", days: 22 },
    { name: "Bangsar South", owner: "Mr. Lim", unit: "C-8-4", days: 44 },
  ];
  return (
    <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)", background: "#fff" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Expiring Soon</p>
      </div>
      {rows.map((r, i) => {
        const urgent = r.days < 14;
        const mid = r.days < 30;
        const color = urgent ? "#DC2626" : mid ? "#D97706" : "#16a34a";
        const bg = urgent ? "rgba(220,38,38,0.08)" : mid ? "rgba(217,119,6,0.08)" : "rgba(22,163,74,0.08)";
        return (
          <div key={r.name} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--kk-line)" : "none" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.2 }}>{r.name}</p>
              <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>{r.owner} · {r.unit}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color }}>{r.days}d</span>
          </div>
        );
      })}
    </div>
  );
}

function MockTenantPackage() {
  const tenants = [
    { num: 1, name: "Clemmie Leong", age: 23, job: "Consultant", budget: "RM 6,000/mo", income: "RM 20,000/mo", moveIn: "Oct 2026" },
    { num: 2, name: "Cyrus Leong", age: 27, job: "Property Agent", budget: "RM 2,000/mo", income: "RM 6,000/mo", moveIn: "Jun 2026" },
  ];
  return (
    <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)", background: "#fff" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tenants for</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.3 }}>Sentral Suites KLCC, A5205</p>
      </div>
      {tenants.map((t, i) => (
        <div key={t.name} className="px-3 py-2 flex items-start gap-2" style={{ borderBottom: i < tenants.length - 1 ? "1px solid var(--kk-line)" : "none" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--kk-ink)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {t.num}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.2 }}>{t.name}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)", marginBottom: 4 }}>{t.age} · {t.job}</p>
            <div className="flex flex-wrap gap-1">
              <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 10, background: "var(--kk-green-soft)", color: "var(--kk-green)", fontWeight: 600 }}>{t.budget}</span>
              <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 10, background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Inc {t.income}</span>
              <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 10, background: "#EFF6FF", color: "#3B82F6" }}>{t.moveIn}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockHomeServices() {
  const contacts = [
    { emoji: "🧹", name: "Auni Cleaning Services", phone: "6012-2388101", area: "KL, Ampang, Cheras", note: "Deep clean · RM 100–180/session" },
    { emoji: "⚡", name: "Farid Elektrik", phone: "6017-3388203", area: "Subang, Shah Alam, Klang", note: "Licensed · RM 80–150/visit" },
    { emoji: "❄️", name: "KL Air-Cond Pro", phone: "6011-2388205", area: "KL, PJ, Damansara", note: "Service from RM 80 · Repair & install" },
  ];
  return (
    <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)", background: "#fff" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Property Supports</p>
      </div>
      {contacts.map((c, i) => (
        <div key={c.name} className="px-3 py-2 flex items-start gap-2" style={{ borderBottom: i < contacts.length - 1 ? "1px solid var(--kk-line)" : "none" }}>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>{c.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-start justify-between gap-1">
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.2 }}>{c.name}</p>
              <span style={{ fontSize: 7, padding: "2px 5px", borderRadius: 8, background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)", border: "1px solid var(--kk-line)", flexShrink: 0, fontWeight: 600 }}>Suggested</span>
            </div>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>{c.phone}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>📍 {c.area}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-mute)", marginTop: 2 }}>{c.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockCommissions() {
  return (
    <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)", background: "#fff" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Career Stats</p>
      </div>
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <div className="flex gap-5">
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>61</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>deals closed</p>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>RM 190.4k</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>total earned</p>
          </div>
        </div>
      </div>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>2026 Progress</p>
        <div className="flex justify-between items-baseline" style={{ marginBottom: 5 }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: "var(--kk-ink)", letterSpacing: "-0.02em" }}>RM 96,000</p>
          <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>of RM 240k · 40%</p>
        </div>
        <div style={{ height: 4, background: "var(--kk-surface-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "40%", height: "100%", background: "#3B82F6", borderRadius: 2 }} />
        </div>
      </div>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <p style={{ fontSize: 10, color: "var(--kk-ink-mute)" }}>
          Best month: <strong style={{ color: "var(--kk-ink)" }}>RM 64,200</strong>
        </p>
      </div>
      <div className="px-3 py-2">
        <p style={{ fontSize: 8, fontWeight: 700, color: "var(--kk-ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>To hit goal</p>
        <p style={{ fontSize: 14, fontWeight: 900, color: "var(--kk-green)", letterSpacing: "-0.02em", lineHeight: 1 }}>RM 20,571/mo</p>
        <p style={{ fontSize: 9, color: "var(--kk-ink-faint)", marginTop: 2 }}>for rest of year</p>
      </div>
    </div>
  );
}

const ITEMS: Array<{ icon: LucideIcon; title: string; desc: string; Mock: () => React.ReactElement }> = [
  {
    icon: Bell,
    title: "Tells you when contracts expire",
    desc: "See everything expiring in 30, 60, 90 days before the owner even thinks about calling another agent.",
    Mock: MockContractExpiry,
  },
  {
    icon: Share2,
    title: "Send beautiful tenant packages",
    desc: "Manage your listings and share a polished tenant profile with owners using one link. No more PDFs.",
    Mock: MockTenantPackage,
  },
  {
    icon: Wrench,
    title: "One click to home services",
    desc: "Cleaning, air cond servicing, electrician. All contacts in one place, every job logged automatically.",
    Mock: MockHomeServices,
  },
  {
    icon: BarChart3,
    title: "Plan your income, hit your targets",
    desc: "See your monthly earnings, track your goal progress, and know exactly how much more you need to close.",
    Mock: MockCommissions,
  },
];

interface FloatingHeart { id: number; x: number; y: number }

function SolutionCard({ icon: Icon, title, desc, Mock }: { icon: LucideIcon; title: string; desc: string; Mock: () => React.ReactElement }) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [hovered, setHovered] = useState(false);
  const nextId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setHearts(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 900);
  }

  return (
    <div
      className="relative rounded-2xl p-6 flex flex-col cursor-pointer overflow-hidden"
      style={{
        background: "var(--kk-bg)", border: "1px solid var(--kk-line)",
        transition: "box-shadow 0.2s ease",
        boxShadow: hovered ? "0 6px 24px rgba(0,0,0,0.09)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div style={{ minHeight: 220 }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--kk-green-soft)" }}>
          <Icon className="w-6 h-6" style={{ color: "var(--kk-green)" }} />
        </div>
        <p className="font-semibold mb-2" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>{title}</p>
        <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>{desc}</p>
      </div>
      <Mock />

      {hovered && hearts.length === 0 && (
        <Heart className="absolute bottom-4 right-4 pointer-events-none" style={{ width: 16, height: 16, color: "rgba(255,45,85,0.25)", fill: "rgba(255,45,85,0.25)" }} />
      )}
      {hearts.map(h => (
        <Heart key={h.id} className="absolute pointer-events-none" style={{ left: h.x - 12, top: h.y - 12, width: 24, height: 24, color: "#FF2D55", fill: "#FF2D55", animation: "kk-heart-float 0.9s ease-out forwards" }} />
      ))}
    </div>
  );
}

export function SolutionCards() {
  return (
    <>
      <style>{`
        @keyframes kk-heart-float {
          0%   { transform: scale(0.5) translateY(0);     opacity: 1; }
          50%  { transform: scale(1.2) translateY(-22px); opacity: 1; }
          100% { transform: scale(0.8) translateY(-52px); opacity: 0; }
        }
      `}</style>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {ITEMS.map(item => (
          <SolutionCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} Mock={item.Mock} />
        ))}
      </div>
    </>
  );
}
