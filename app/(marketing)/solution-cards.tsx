"use client";

import { Bell, Users, Send, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

function MockRenewals() {
  const rows = [
    { name: "Residensi Mutiara, A-12", tenant: "Ahmad Firdaus", days: 7, amount: 1800, urgent: true },
    { name: "Sri Damansara Apt, B-03", tenant: "Nurul Izzah", days: 23, amount: 2200, urgent: false },
    { name: "Desa ParkCity, C-8-4", tenant: "Lim Wei Jie", days: 41, amount: 2800, urgent: false },
  ];
  return (
    <div className="mt-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Expiring Soon</p>
        <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 20, background: "#FEF2F2", color: "#DC2626", fontWeight: 700 }}>3 contracts</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--kk-line)" : "none", background: "#fff" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>{r.tenant} · RM {r.amount.toLocaleString()}/mo</p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 8,
            background: r.urgent ? "#FEF2F2" : r.days < 30 ? "#FFFBEB" : "#F0FDF4",
            color: r.urgent ? "#DC2626" : r.days < 30 ? "#D97706" : "#16a34a",
          }}>{r.days}d left</span>
        </div>
      ))}
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>Renewal income potential</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>RM 3,400/mo</p>
      </div>
    </div>
  );
}

function MockOwnerLeads() {
  const leads = [
    { name: "Puan Hafizah", unit: "Mont Kiara Suites, 3BR", status: "Interested", statusColor: "#16a34a", statusBg: "#F0FDF4", rent: 3200 },
    { name: "Encik Razali", unit: "Bangsar South, 2BR", status: "Follow up", statusColor: "#D97706", statusBg: "#FFFBEB", rent: 2500 },
    { name: "Mr. Lim", unit: "KLCC Condo, Studio", status: "Not contacted", statusColor: "var(--kk-ink-faint)", statusBg: "var(--kk-surface-2)", rent: 1800 },
  ];
  return (
    <div className="mt-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Owner Leads</p>
        <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 20, background: "#EFF6FF", color: "#3B82F6", fontWeight: 700 }}>87 tracked</span>
      </div>
      {leads.map((l, i) => (
        <div key={l.name} className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: i < leads.length - 1 ? "1px solid var(--kk-line)" : "none", background: "#fff" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--kk-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontWeight: 700, color: "var(--kk-ink-mute)" }}>
            {l.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.2 }}>{l.name}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.unit} · RM {l.rent.toLocaleString()}/mo</p>
          </div>
          <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 10, background: l.statusBg, color: l.statusColor, fontWeight: 600, flexShrink: 0 }}>{l.status}</span>
        </div>
      ))}
    </div>
  );
}

function MockTenantPack() {
  const tenants = [
    { initials: "CL", name: "Clemmie Leong", job: "Finance Consultant", budget: "RM 3,500/mo", badge: "Best match" },
    { initials: "RH", name: "Raj Harun", job: "Software Engineer", budget: "RM 3,200/mo", badge: "Good match" },
  ];
  return (
    <div className="mt-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tenant Pack · Shared via link</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.3, marginTop: 1 }}>Sentral Suites KLCC, A-52-05</p>
      </div>
      {tenants.map((t, i) => (
        <div key={t.name} className="px-3 py-2.5 flex items-center gap-2.5" style={{ borderBottom: i < tenants.length - 1 ? "1px solid var(--kk-line)" : "none", background: "#fff" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--kk-ink)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {t.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.2 }}>{t.name}</p>
            <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>{t.job} · {t.budget}</p>
          </div>
          <span style={{ fontSize: 7, padding: "2px 6px", borderRadius: 10, background: i === 0 ? "var(--kk-green-soft)" : "var(--kk-surface-2)", color: i === 0 ? "var(--kk-green)" : "var(--kk-ink-mute)", fontWeight: 700, flexShrink: 0 }}>{t.badge}</span>
        </div>
      ))}
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
        <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>Owner viewed · 3 min ago</p>
      </div>
    </div>
  );
}

function MockPerformance() {
  return (
    <div className="mt-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>2026 Performance</p>
      </div>
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "#fff" }}>
        <div className="flex gap-4">
          {[{ label: "deals closed", val: "61" }, { label: "total earned", val: "RM 190k" }].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 17, fontWeight: 900, color: "var(--kk-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--kk-line)", background: "#fff" }}>
        <div className="flex justify-between items-baseline" style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: "var(--kk-ink)", letterSpacing: "-0.02em" }}>RM 96,000</p>
          <p style={{ fontSize: 9, color: "var(--kk-ink-faint)" }}>of RM 240k goal · 40%</p>
        </div>
        <div style={{ height: 5, background: "var(--kk-surface-2)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: "40%", height: "100%", background: "#3B82F6", borderRadius: 3 }} />
        </div>
      </div>
      <div className="px-3 py-2.5" style={{ background: "#fff" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "var(--kk-ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>To hit goal — need per month</p>
        <p style={{ fontSize: 15, fontWeight: 900, color: "#16a34a", letterSpacing: "-0.02em", lineHeight: 1 }}>RM 20,571</p>
      </div>
    </div>
  );
}

const ITEMS: Array<{ icon: LucideIcon; title: string; desc: string; Mock: () => React.ReactElement }> = [
  {
    icon: Bell,
    title: "Never miss a contract renewal",
    desc: "See every expiring contract in one list — 7, 30, 60 days out. Know before the owner calls someone else.",
    Mock: MockRenewals,
  },
  {
    icon: Users,
    title: "Close every owner lead",
    desc: "Track every owner from first contact to signed deal. No more leads dying in your WhatsApp chat.",
    Mock: MockOwnerLeads,
  },
  {
    icon: Send,
    title: "Share polished tenant packs",
    desc: "Build a professional tenant shortlist and share it with owners via one link. No more copying profiles.",
    Mock: MockTenantPack,
  },
  {
    icon: BarChart3,
    title: "Know exactly what you need to close",
    desc: "See your monthly earnings, track your year-end goal, and know the exact number to hit it.",
    Mock: MockPerformance,
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
      <div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--kk-green-soft)" }}>
          <Icon className="w-5 h-5" style={{ color: "var(--kk-green)" }} />
        </div>
        <p className="font-semibold mb-2" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)", lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>{desc}</p>
      </div>
      <Mock />

      {hearts.map(h => (
        <svg key={h.id} className="absolute pointer-events-none" style={{ left: h.x - 12, top: h.y - 12, width: 24, height: 24, animation: "kk-heart-float 0.9s ease-out forwards" }} viewBox="0 0 24 24" fill="#FF2D55">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ITEMS.map(item => (
          <SolutionCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} Mock={item.Mock} />
        ))}
      </div>
    </>
  );
}
