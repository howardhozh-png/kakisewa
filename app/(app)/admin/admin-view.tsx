"use client";

import React, { useState, useMemo } from "react";
import {
  Plus, Copy, Check, ExternalLink, Edit2, ChevronRight, CheckCircle2,
  ChevronUp, ChevronDown, Search, X as XIcon, Users, Activity,
  AlertCircle, TrendingUp, FileText, DollarSign, ArrowUpRight,
  ArrowDownRight, Minus, ChevronDown as Expand, Clock, Zap, Ghost,
  BarChart2, Link, MessageSquare, Mail, UserPlus, List,
} from "lucide-react";
import { toast } from "sonner";
import { adminResetMyAccount } from "@/lib/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkRow {
  id: string; slug: string; label: string; created_at: string;
  sends: number; clicks: number; signups: number;
}
interface Funnel {
  total: number; beta: number; beta_frozen: number; trial: number;
  expired: number; active: number; unset: number; elite: number;
}
interface FeedbackRow {
  id: string; agent_name: string | null; agent_email: string | null;
  category: string; message: string; page_url: string | null;
  resolved: boolean; created_at: string;
}
interface AgentRow {
  id: string; name: string | null; email: string | null;
  phone: string | null; agency: string | null; ren_number: string | null;
  subscription_status: string | null; subscription_plan: string | null;
  trial_days_left: number | null; joined_at: string;
  last_login_at: string | null; days_inactive: number | null;
  potential_listing_count: number; outreaches_sent: number;
  my_listing_count: number; existing_listing_count: number;
  target_listing_count: number; renewal_wa_count: number;
  feedback_count: number; subscription_activated_at: string | null;
  is_test_account: boolean;
}
interface InviteRow { id: string; email: string; invited_at: string; used_at: string | null; }
interface WaitlistRow { id: string; name: string | null; email: string; ren_number: string | null; expected_spend: string | null; created_at: string; }
interface RawLead { user_id: string; stage: string; wa_status: string | null; created_at: string; last_outreach_at: string | null; is_competitor_target: boolean | null; }
interface RawTenancy { user_id: string; created_at: string; contract_end: string | null; amount: number | null; stage: string | null; }
interface RawFeedbackItem { agent_id: string; created_at: string; }

// ─── Constants ───────────────────────────────────────────────────────────────

const MRR_BY_PLAN: Record<string, number> = { silver: 29, gold: 49, platinum: 99, elite: 159 };
const PLAN_LABEL: Record<string, string> = { silver: "Silver", gold: "Gold", platinum: "Platinum", elite: "Elite" };
const PLAN_COLOR: Record<string, { text: string; bg: string; bar: string }> = {
  silver:   { text: "#1D4ED8", bg: "rgba(59,130,246,0.10)",  bar: "#3B82F6" },
  gold:     { text: "#92400E", bg: "rgba(255,149,0,0.10)",   bar: "#FF9500" },
  platinum: { text: "#0b1f4a", bg: "rgba(11,31,74,0.12)",    bar: "#334155" },
  elite:    { text: "#6b3d1e", bg: "rgba(107,61,30,0.12)",   bar: "#92400E" },
};
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  beta:        { bg: "rgba(139,92,246,0.10)",  color: "#6d28d9", label: "Beta" },
  beta_frozen: { bg: "rgba(59,130,246,0.10)",  color: "#1d4ed8", label: "Frozen" },
  trial:       { bg: "rgba(16,185,129,0.10)",  color: "#065F46", label: "Trial" },
  expired:     { bg: "rgba(220,38,38,0.10)",   color: "#DC2626", label: "Expired" },
  active:      { bg: "rgba(0,113,227,0.10)",   color: "#0071E3", label: "Paid" },
};
const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  bug:        { bg: "rgba(220,38,38,0.10)",  color: "#DC2626", label: "Bug" },
  suggestion: { bg: "rgba(234,179,8,0.12)",  color: "#A16207", label: "Suggestion" },
  question:   { bg: "rgba(99,102,241,0.12)", color: "#4338CA", label: "Question" },
};

// ─── Segment + Health Score ──────────────────────────────────────────────────

type Segment = "power" | "active" | "risk" | "ghost" | "new";

const SEGMENT_META: Record<Segment, { label: string; desc: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  power:  { label: "Power user",  desc: "High activity + 10+ cards", color: "#1F8B4C", bg: "rgba(52,199,89,0.10)",   border: "#34C759", icon: <Zap className="w-3 h-3" /> },
  active: { label: "Active",      desc: "Logging in regularly",      color: "#0071E3", bg: "rgba(0,113,227,0.10)",   border: "#0071E3", icon: <Activity className="w-3 h-3" /> },
  risk:   { label: "At risk",     desc: "Low activity lately",       color: "#92400E", bg: "rgba(255,149,0,0.10)",   border: "#FF9500", icon: <AlertCircle className="w-3 h-3" /> },
  ghost:  { label: "Ghost",       desc: "Never added any cards",     color: "#6E6E73", bg: "rgba(110,110,115,0.10)", border: "#C7C7CC", icon: <Ghost className="w-3 h-3" /> },
  new:    { label: "New",         desc: "Joined less than 7 days ago",color: "#6d28d9", bg: "rgba(139,92,246,0.10)",  border: "#8b5cf6", icon: <UserPlus className="w-3 h-3" /> },
};

function computeHealthScore(a: AgentRow): number {
  let activity = 0;
  if (a.days_inactive === null) activity = 0;
  else if (a.days_inactive === 0) activity = 50;
  else if (a.days_inactive <= 3) activity = 42;
  else if (a.days_inactive <= 7) activity = 32;
  else if (a.days_inactive <= 14) activity = 18;
  else if (a.days_inactive <= 30) activity = 6;
  const cardsScore = Math.min(40, (a.potential_listing_count + a.existing_listing_count) * 4);
  const planScore = a.subscription_status === "active" ? 10
    : (a.subscription_status === "beta" || a.subscription_status === "trial") ? 5 : 0;
  return Math.min(100, activity + cardsScore + planScore);
}

function computeSegment(a: AgentRow): Segment {
  const joinedMs = Date.now() - new Date(a.joined_at).getTime();
  const totalCards = a.potential_listing_count + a.existing_listing_count;
  if (joinedMs >= 7 * 86400000 && totalCards === 0) return "ghost";
  if (joinedMs < 7 * 86400000) return "new";
  const score = computeHealthScore(a);
  if (score >= 70) return "power";
  if (score >= 35) return "active";
  return "risk";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function InactiveBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: "var(--kk-ink-faint)", fontSize: 11 }}>Never</span>;
  const color = days <= 6 ? "#1F8B4C" : days <= 13 ? "#92400E" : "#DC2626";
  const bg    = days <= 6 ? "rgba(52,199,89,0.10)" : days <= 13 ? "rgba(255,149,0,0.12)" : "rgba(220,38,38,0.10)";
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums" style={{ background: bg, color }}>
      {days === 0 ? "Today" : `${days}d ago`}
    </span>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "#34C759" : score >= 35 ? "#0071E3" : score >= 15 ? "#FF9500" : "#C7C7CC";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "var(--kk-line)" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 600ms ease" }} />
      </div>
      <span className="tabular-nums text-[11px] font-semibold shrink-0" style={{ color, minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function TrendPill({ now, prev }: { now: number; prev: number }) {
  const delta = now - prev;
  if (delta === 0) return <span className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>= flat</span>;
  const up = delta > 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: up ? "#1F8B4C" : "#DC2626" }}>
      {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {up ? "+" : ""}{delta} vs last wk
    </span>
  );
}

function FunnelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "var(--kk-line)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 600ms ease" }} />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, trend }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon?: React.ReactNode;
  trend?: { now: number; prev: number };
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span style={{ color: color ?? "var(--kk-ink-faint)" }}>{icon}</span>}
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.08em" }}>{label}</p>
      </div>
      <p className="tabular-nums font-bold" style={{ fontSize: "1.55rem", lineHeight: 1, color: color ?? "var(--kk-ink)" }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>{sub}</p>}
      {trend && <TrendPill now={trend.now} prev={trend.prev} />}
    </div>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function SegmentDonut({ segments, total, onSelect }: {
  segments: Record<Segment, number>;
  total: number;
  onSelect: (s: Segment | "all") => void;
}) {
  const R = 70; const CX = 100; const CY = 100; const SW = 26;
  const circ = 2 * Math.PI * R;
  const GAP = total > 0 ? (3 / 360) * circ : 0;
  const segs = (Object.keys(SEGMENT_META) as Segment[]).map(seg => ({
    seg, meta: SEGMENT_META[seg], count: segments[seg] ?? 0,
  })).filter(s => s.count > 0);

  let offset = -circ / 4; // start from top
  const arcs = segs.map(({ seg, meta, count }) => {
    const arc = (count / total) * circ - GAP;
    const thisOffset = offset;
    offset += arc + GAP;
    return { seg, meta, count, arc, offset: thisOffset };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180, display: "block" }}>
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={SW} stroke="var(--kk-line)" />
          {/* Arcs */}
          {total === 0 ? (
            <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={SW} stroke="var(--kk-line)" strokeDasharray={`${circ} 0`} />
          ) : arcs.map(({ seg, meta, arc, offset: off }) => (
            <circle key={seg} cx={CX} cy={CY} r={R} fill="none"
              strokeWidth={SW} stroke={meta.border}
              strokeDasharray={`${Math.max(0, arc)} ${circ}`}
              strokeDashoffset={-off}
              strokeLinecap="butt"
              style={{ cursor: "pointer", transition: "opacity 150ms" }}
              onClick={() => onSelect(seg)}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="tabular-nums font-bold" style={{ fontSize: "2rem", lineHeight: 1, color: "var(--kk-ink)" }}>{total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.08em" }}>users</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 flex-1 w-full">
        {(Object.keys(SEGMENT_META) as Segment[]).map(seg => {
          const meta = SEGMENT_META[seg];
          const count = segments[seg] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <button key={seg} onClick={() => onSelect(seg)}
              className="flex items-center gap-3 w-full text-left transition-opacity hover:opacity-70 active:scale-95">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.border }} />
              <span className="text-[13px] font-medium flex-1" style={{ color: "var(--kk-ink)" }}>{meta.label}</span>
              <span className="tabular-nums text-[13px] font-bold" style={{ color: meta.color, minWidth: 28, textAlign: "right" }}>{count}</span>
              <div className="w-20 rounded-full overflow-hidden" style={{ height: 4, background: "var(--kk-line)", flexShrink: 0 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: meta.border, borderRadius: 99 }} />
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-faint)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────────────────

function HealthTab({ agents, funnel, rawLeads, rawTenancies, onSelectSegment }: {
  agents: AgentRow[]; funnel: Funnel;
  rawLeads: RawLead[]; rawTenancies: RawTenancy[];
  onSelectSegment: (s: Segment | "all") => void;
}) {
  const now = Date.now();
  const weekMs = 7 * 86400000;

  const metrics = useMemo(() => {
    const thisWeekCutoff = now - weekMs;
    const lastWeekCutoff = now - 2 * weekMs;

    const newSignupsThisWeek = agents.filter(a => new Date(a.joined_at).getTime() >= thisWeekCutoff).length;
    const newSignupsLastWeek = agents.filter(a => {
      const t = new Date(a.joined_at).getTime();
      return t >= lastWeekCutoff && t < thisWeekCutoff;
    }).length;

    const leadsThisWeek = rawLeads.filter(l => l.user_id && new Date(l.created_at).getTime() >= thisWeekCutoff && !l.is_competitor_target).length;
    const leadsLastWeek = rawLeads.filter(l => {
      const t = new Date(l.created_at).getTime();
      return l.user_id && t >= lastWeekCutoff && t < thisWeekCutoff && !l.is_competitor_target;
    }).length;

    const contractsThisWeek = rawTenancies.filter(t => new Date(t.created_at).getTime() >= thisWeekCutoff).length;
    const contractsLastWeek = rawTenancies.filter(t => {
      const ms = new Date(t.created_at).getTime();
      return ms >= lastWeekCutoff && ms < thisWeekCutoff;
    }).length;

    const activatedCount = agents.filter(a => a.potential_listing_count + a.existing_listing_count > 0).length;
    const active7d = agents.filter(a => a.days_inactive !== null && a.days_inactive <= 6).length;

    const segments = agents.reduce((acc, a) => {
      const seg = computeSegment(a);
      acc[seg] = (acc[seg] ?? 0) + 1;
      return acc;
    }, {} as Record<Segment, number>);

    const trialExpiringSoon = agents
      .filter(a => (a.subscription_status === "trial" || a.subscription_status === "beta") && a.trial_days_left !== null && a.trial_days_left <= 14 && a.trial_days_left >= 0)
      .sort((a, b) => (a.trial_days_left ?? 99) - (b.trial_days_left ?? 99));

    const contractsExpiring30 = rawTenancies.filter(t => {
      if (!t.contract_end) return false;
      const ms = new Date(t.contract_end).getTime() - now;
      return ms >= 0 && ms <= 30 * 86400000;
    }).length;
    const contractsExpiring60 = rawTenancies.filter(t => {
      if (!t.contract_end) return false;
      const ms = new Date(t.contract_end).getTime() - now;
      return ms > 30 * 86400000 && ms <= 60 * 86400000;
    }).length;

    return { newSignupsThisWeek, newSignupsLastWeek, leadsThisWeek, leadsLastWeek, contractsThisWeek, contractsLastWeek, activatedCount, active7d, segments, trialExpiringSoon, contractsExpiring30, contractsExpiring60 };
  }, [agents, rawLeads, rawTenancies]);

  const funnelSteps = [
    { label: "Signed up", value: funnel.total, color: "var(--kk-ink)" },
    { label: "Added a card", value: metrics.activatedCount, color: "#0071E3" },
    { label: "Active last 7d", value: metrics.active7d, color: "#34C759" },
    { label: "Paying", value: funnel.active, color: "#FF9500" },
  ];

  return (
    <div className="space-y-8">
      {/* Activation funnel */}
      <section>
        <p className="kk-overline mb-4">Activation funnel</p>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
          {funnelSteps.map((step, i) => {
            const prev = i === 0 ? step.value : funnelSteps[i - 1].value;
            const dropPct = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
            return (
              <div key={step.label} className="flex items-center gap-4 px-5 py-4" style={{ background: "var(--kk-surface)", borderTop: i > 0 ? "1px solid var(--kk-line)" : "none" }}>
                <div style={{ width: 40, flexShrink: 0 }}>
                  <p className="tabular-nums font-bold" style={{ fontSize: "1.4rem", color: step.color, lineHeight: 1 }}>{step.value}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{step.label}</p>
                    {i > 0 && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: dropPct >= 60 ? "rgba(52,199,89,0.10)" : "rgba(220,38,38,0.08)", color: dropPct >= 60 ? "#1F8B4C" : "#DC2626" }}>
                        {dropPct}% of prev step
                      </span>
                    )}
                  </div>
                  <FunnelBar value={step.value} max={funnel.total || 1} color={step.color} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Segments donut */}
      <section>
        <p className="kk-overline mb-4">User segments — click to filter</p>
        <div className="rounded-2xl p-6" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <SegmentDonut segments={metrics.segments as Record<Segment, number>} total={funnel.total} onSelect={onSelectSegment} />
        </div>
      </section>

      {/* Weekly pulse */}
      <section>
        <p className="kk-overline mb-4">Weekly pulse</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.08em" }}>New signups</p>
            <p className="tabular-nums font-bold" style={{ fontSize: "1.6rem", lineHeight: 1, color: "var(--kk-ink)" }}>{metrics.newSignupsThisWeek}</p>
            <div className="mt-1"><TrendPill now={metrics.newSignupsThisWeek} prev={metrics.newSignupsLastWeek} /></div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.08em" }}>New leads</p>
            <p className="tabular-nums font-bold" style={{ fontSize: "1.6rem", lineHeight: 1, color: "var(--kk-ink)" }}>{metrics.leadsThisWeek}</p>
            <div className="mt-1"><TrendPill now={metrics.leadsThisWeek} prev={metrics.leadsLastWeek} /></div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.08em" }}>New contracts</p>
            <p className="tabular-nums font-bold" style={{ fontSize: "1.6rem", lineHeight: 1, color: "var(--kk-ink)" }}>{metrics.contractsThisWeek}</p>
            <div className="mt-1"><TrendPill now={metrics.contractsThisWeek} prev={metrics.contractsLastWeek} /></div>
          </div>
        </div>
      </section>

      {/* Trial expiry radar */}
      {metrics.trialExpiringSoon.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="kk-overline">Trial expiring soon ({metrics.trialExpiringSoon.length})</p>
            <button
              onClick={() => { const emails = metrics.trialExpiringSoon.filter(a => a.email).map(a => a.email).join(", "); navigator.clipboard.writeText(emails); toast.success("Emails copied"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.2)", color: "var(--kk-blue)" }}
            >
              <Copy className="w-3 h-3" /> Copy emails
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,149,0,0.3)" }}>
            {metrics.trialExpiringSoon.map((a, i) => {
              const days = a.trial_days_left ?? 0;
              const urgent = days <= 3;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? "var(--kk-surface)" : "rgba(255,149,0,0.03)", borderTop: i > 0 ? "1px solid rgba(255,149,0,0.15)" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{a.name || "—"}</p>
                    <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{a.email}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: urgent ? "rgba(220,38,38,0.10)" : "rgba(255,149,0,0.10)", color: urgent ? "#DC2626" : "#92400E" }}>
                    {days === 0 ? "Expires today" : `${days}d left`}
                  </span>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-mute)" }}>{a.potential_listing_count + a.existing_listing_count} cards</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Contracts expiring */}
      <section>
        <p className="kk-overline mb-3">Contracts expiring soon</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Next 30 days", count: metrics.contractsExpiring30, color: "#DC2626", bg: "rgba(220,38,38,0.06)", dot: "var(--kk-red)" },
            { label: "31 to 60 days", count: metrics.contractsExpiring60, color: "#92400E", bg: "rgba(255,149,0,0.06)", dot: "var(--kk-amber)" },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.dot }} />
                <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{item.label}</p>
                <span className="ml-auto tabular-nums font-bold text-[1.3rem] leading-none" style={{ color: item.color }}>{item.count}</span>
              </div>
              <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                {item.count === 0 ? "All clear." : `${item.count} tenancy contract${item.count !== 1 ? "s" : ""} need renewal attention.`}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

type SortCol = "name" | "joined_at" | "last_login_at" | "days_inactive" | "health" | "potential" | "listed" | "existing" | "target" | "outreach_wa" | "renewal_wa" | "msgs";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

function AgentDetailPanel({ a, onTestToggled }: { a: AgentRow & { segment: Segment; health: number }; onTestToggled: (id: string, val: boolean) => void }) {
  const statusStyle = STATUS_STYLE[a.subscription_status ?? ""] ?? null;
  const [toggling, setToggling] = useState(false);

  async function handleTestToggle() {
    setToggling(true);
    const res = await fetch("/api/admin/toggle-test-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, is_test_account: !a.is_test_account }),
    });
    if (res.ok) {
      onTestToggled(a.id, !a.is_test_account);
      toast.success(a.is_test_account ? "Test tag removed" : "Marked as test account");
    } else {
      toast.error("Failed to update");
    }
    setToggling(false);
  }

  return (
    <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ background: "rgba(0,0,0,0.025)", borderTop: "1px solid var(--kk-line)" }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Plan / Status</p>
        <div className="flex flex-wrap gap-1">
          {statusStyle && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
          )}
          {a.subscription_plan && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: PLAN_COLOR[a.subscription_plan]?.bg ?? "var(--kk-surface-2)", color: PLAN_COLOR[a.subscription_plan]?.text ?? "var(--kk-ink)" }}>{a.subscription_plan}</span>
          )}
          {(a.subscription_status === "trial" || a.subscription_status === "beta") && a.trial_days_left !== null && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: (a.trial_days_left ?? 99) <= 3 ? "rgba(220,38,38,0.10)" : "rgba(255,149,0,0.10)", color: (a.trial_days_left ?? 99) <= 3 ? "#DC2626" : "#92400E" }}>
              {a.trial_days_left > 0 ? `${a.trial_days_left}d trial left` : "Trial expired"}
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Activity</p>
        <div className="text-[12px] space-y-0.5" style={{ color: "var(--kk-ink-mute)" }}>
          <p>Joined {fmtShort(a.joined_at)}</p>
          <p>Last login {fmtShort(a.last_login_at)}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Cards</p>
        <div className="text-[12px] space-y-0.5" style={{ color: "var(--kk-ink-mute)" }}>
          <p>{a.potential_listing_count} potential · {a.my_listing_count} listed</p>
          <p>{a.existing_listing_count} existing · {a.target_listing_count} target</p>
          {a.feedback_count > 0 && <p>{a.feedback_count} feedback</p>}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Messages sent</p>
        <div className="text-[12px] space-y-0.5" style={{ color: "var(--kk-ink-mute)" }}>
          <p>{a.outreaches_sent} owner outreach WAs</p>
          <p>{a.renewal_wa_count} renewal WAs (active threads)</p>
          <p className="font-semibold" style={{ color: "var(--kk-ink)" }}>{a.outreaches_sent + a.renewal_wa_count} total</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--kk-ink-faint)" }}>Actions</p>
        <div className="flex gap-2 flex-wrap">
          {a.email && (
            <button onClick={() => { navigator.clipboard.writeText(a.email!); toast.success("Email copied"); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
              <Mail className="w-3 h-3" /> Copy email
            </button>
          )}
          <a href={`https://us.posthog.com/persons?search=${encodeURIComponent(a.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70" style={{ background: "rgba(240,100,30,0.08)", border: "1px solid rgba(240,100,30,0.2)", color: "#E05A1E" }}>
            <ExternalLink className="w-3 h-3" /> PostHog
          </a>
          <button
            onClick={handleTestToggle}
            disabled={toggling}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ background: a.is_test_account ? "rgba(110,110,115,0.12)" : "rgba(110,110,115,0.08)", border: "1px solid rgba(110,110,115,0.25)", color: "#6E6E73" }}>
            {a.is_test_account ? "Remove test tag" : "Mark as test"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ agents: initialAgents, rawLeads, rawTenancies, rawFeedback, initialSegment }: {
  agents: AgentRow[];
  rawLeads: RawLead[]; rawTenancies: RawTenancy[]; rawFeedback: RawFeedbackItem[];
  initialSegment: Segment | "all";
}) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState<Segment | "all">(initialSegment);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortCol, setSortCol] = useState<SortCol>("days_inactive");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleTestToggled(id: string, val: boolean) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, is_test_account: val } : a));
  }

  const NUMERIC_COLS = new Set<SortCol>(["potential", "listed", "existing", "target", "outreach_wa", "renewal_wa", "msgs", "health"]);
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir(NUMERIC_COLS.has(col) ? "desc" : "asc"); }
  }

  const enriched = useMemo(() => agents.map(a => ({
    ...a,
    segment: computeSegment(a),
    health: computeHealthScore(a),
    totalCards: a.potential_listing_count + a.existing_listing_count,
    totalMsgs: a.outreaches_sent + a.renewal_wa_count,
  })), [agents]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents.length };
    for (const a of enriched) counts[a.segment] = (counts[a.segment] ?? 0) + 1;
    return counts;
  }, [enriched, agents.length]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(a => (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q) || (a.agency ?? "").toLowerCase().includes(q));
    }
    if (segFilter !== "all") rows = rows.filter(a => a.segment === segFilter);
    if (statusFilter === "test") rows = rows.filter(a => a.is_test_account);
    else if (statusFilter !== "all") rows = rows.filter(a => a.subscription_status === statusFilter);
    return [...rows].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortCol === "name") { av = (a.name ?? "").toLowerCase(); bv = (b.name ?? "").toLowerCase(); }
      else if (sortCol === "joined_at") { av = a.joined_at; bv = b.joined_at; }
      else if (sortCol === "last_login_at") { av = a.last_login_at ?? ""; bv = b.last_login_at ?? ""; }
      else if (sortCol === "days_inactive") { av = a.days_inactive ?? 9999; bv = b.days_inactive ?? 9999; }
      else if (sortCol === "health") { av = a.health; bv = b.health; }
      else if (sortCol === "potential") { av = a.potential_listing_count; bv = b.potential_listing_count; }
      else if (sortCol === "listed") { av = a.my_listing_count; bv = b.my_listing_count; }
      else if (sortCol === "existing") { av = a.existing_listing_count; bv = b.existing_listing_count; }
      else if (sortCol === "target") { av = a.target_listing_count; bv = b.target_listing_count; }
      else if (sortCol === "outreach_wa") { av = a.outreaches_sent; bv = b.outreaches_sent; }
      else if (sortCol === "renewal_wa") { av = a.renewal_wa_count; bv = b.renewal_wa_count; }
      else if (sortCol === "msgs") { av = a.totalMsgs; bv = b.totalMsgs; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [enriched, search, segFilter, statusFilter, sortCol, sortDir]);

  function exportCsv() {
    const rows = [
      ["Name","Email","Agency","Status","Plan","Segment","Health","Joined","Last Login","Days Inactive","Potential","Listed","Existing","Target","Owner WAs","Renewal WAs","Total Msgs"].join(","),
      ...filtered.map(a => [
        a.name ?? "", a.email ?? "", a.agency ?? "",
        a.subscription_status ?? "", a.subscription_plan ?? "", a.segment, a.health,
        fmtDate(a.joined_at), fmtDate(a.last_login_at), a.days_inactive ?? "Never",
        a.potential_listing_count, a.my_listing_count, a.existing_listing_count, a.target_listing_count,
        a.outreaches_sent, a.renewal_wa_count, a.totalMsgs,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `users-${Date.now()}.csv`; el.click();
  }

  // sticky-compatible th — position:sticky requires border-collapse:separate
  const TH_BASE: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--kk-ink-mute)",
    borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)",
    position: "sticky", top: 0, zIndex: 20, whiteSpace: "nowrap",
    padding: "10px 12px", textAlign: "left", userSelect: "none",
  };
  const TH_ACTIVE: React.CSSProperties = { ...TH_BASE, color: "var(--kk-ink)" };
  const TH_RIGHT: React.CSSProperties = { ...TH_BASE, textAlign: "right" };
  const TH_RIGHT_ACTIVE: React.CSSProperties = { ...TH_BASE, color: "var(--kk-ink)", textAlign: "right" };

  const Th = ({ col, label, right }: { col: SortCol; label: string; right?: boolean }) => {
    const active = sortCol === col;
    const base = right ? (active ? TH_RIGHT_ACTIVE : TH_RIGHT) : (active ? TH_ACTIVE : TH_BASE);
    return (
      <th onClick={() => toggleSort(col)} style={{ ...base, cursor: "pointer" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          {label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
        </span>
      </th>
    );
  };

  const NumCell = ({ val, muted }: { val: number; muted?: boolean }) => (
    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: val === 0 ? "var(--kk-ink-faint)" : muted ? "var(--kk-ink-mute)" : "var(--kk-ink)", whiteSpace: "nowrap", borderTop: "1px solid var(--kk-line)" }}>
      {val === 0 ? <span style={{ opacity: 0.35 }}>—</span> : val}
    </td>
  );

  return (
    <div>
      {/* Segment chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {/* All chip */}
        <button onClick={() => setSegFilter("all")}
          className="flex flex-col items-start px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
          style={{
            background: segFilter === "all" ? "var(--kk-ink)" : "var(--kk-surface-2)",
            border: "1px solid var(--kk-line)",
            color: segFilter === "all" ? "#fff" : "var(--kk-ink-mute)",
          }}>
          <span className="flex items-center gap-1">
            All <span className="opacity-70">({segmentCounts["all"] ?? 0})</span>
          </span>
        </button>
        {(Object.keys(SEGMENT_META) as Segment[]).map(seg => {
          const active = segFilter === seg;
          const meta = SEGMENT_META[seg];
          return (
            <button key={seg} onClick={() => setSegFilter(active ? "all" : seg)}
              className="flex flex-col items-start px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: active ? meta.bg : "var(--kk-surface-2)",
                border: active ? `1px solid ${meta.border}60` : "1px solid var(--kk-line)",
                color: active ? meta.color : "var(--kk-ink-mute)",
              }}>
              <span className="flex items-center gap-1.5">
                {meta.icon}
                {meta.label}
                <span className="opacity-70">({segmentCounts[seg] ?? 0})</span>
              </span>
              <span className="text-[10px] font-normal mt-0.5" style={{ color: active ? meta.color : "var(--kk-ink-faint)", opacity: 0.8 }}>
                {meta.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter + actions bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--kk-ink-faint)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, agency..."
            className="w-full pl-8 pr-8 py-2 rounded-xl outline-none text-[12px]"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kk-ink-faint)" }}><XIcon className="w-3 h-3" /></button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl px-3 py-2 outline-none text-[12px] font-medium" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
          <option value="all">All statuses</option>
          <option value="beta">Beta</option>
          <option value="beta_frozen">Frozen</option>
          <option value="trial">Trial</option>
          <option value="active">Paid</option>
          <option value="expired">Expired</option>
          <option value="test">Test</option>
        </select>
        <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{filtered.length} of {agents.length}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => { const emails = filtered.filter(a => a.email).map(a => a.email).join(", "); navigator.clipboard.writeText(emails); toast.success(`${filtered.filter(a => a.email).length} emails copied`); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
            <Copy className="w-3.5 h-3.5" /> Copy emails
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Table — border-collapse:separate required for position:sticky on th/td */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 900 }}>
            <thead>
              <tr>
                {/* Sticky corner: User col header */}
                <th onClick={() => toggleSort("name")} style={{
                  ...TH_BASE, color: sortCol === "name" ? "var(--kk-ink)" : "var(--kk-ink-mute)",
                  position: "sticky", top: 0, left: 0, zIndex: 30,
                  minWidth: 220, cursor: "pointer",
                  boxShadow: "2px 0 4px rgba(0,0,0,0.06), inset 0 -1px 0 var(--kk-line)",
                  borderBottom: "none",
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    User <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
                {/* Card columns */}
                <Th col="potential" label="Potl" right />
                <Th col="listed" label="Listed" right />
                <Th col="existing" label="Exist" right />
                <Th col="target" label="Target" right />
                {/* Message columns */}
                <Th col="outreach_wa" label="Owner WA" right />
                <Th col="renewal_wa" label="Renewal WA" right />
                {/* Activity */}
                <Th col="days_inactive" label="Inactive" />
                <Th col="health" label="Health" right />
                {/* Expand */}
                <th style={{ ...TH_BASE, width: 36, padding: "10px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--kk-ink-faint)", background: "var(--kk-surface)" }}>
                    No users match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((a, i) => {
                const seg = a.segment;
                const meta = SEGMENT_META[seg];
                const isExpanded = expandedId === a.id;
                const rowBg = i % 2 === 0 ? "var(--kk-surface)" : "var(--kk-surface-2)";
                const TD: React.CSSProperties = { borderTop: "1px solid var(--kk-line)", background: rowBg };
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                      {/* Sticky User column — colored left border via box-shadow inset */}
                      <td style={{
                        ...TD, position: "sticky", left: 0, zIndex: 10,
                        padding: "10px 12px", minWidth: 220,
                        boxShadow: `inset 3px 0 0 0 ${meta.border}, 2px 0 4px rgba(0,0,0,0.06)`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>
                            {(a.name ?? a.email ?? "?")[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <p style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, color: "var(--kk-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name || "—"}</p>
                              {a.is_test_account && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(110,110,115,0.12)", color: "#6E6E73", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}>Test</span>}
                            </div>
                            <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email || "no email"}</p>
                            {a.agency && <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.agency}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Card counts */}
                      <NumCell val={a.potential_listing_count} />
                      <NumCell val={a.my_listing_count} />
                      <NumCell val={a.existing_listing_count} />
                      <NumCell val={a.target_listing_count} muted />
                      {/* Message counts */}
                      <NumCell val={a.outreaches_sent} />
                      <NumCell val={a.renewal_wa_count} />
                      {/* Activity */}
                      <td style={{ ...TD, padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <InactiveBadge days={a.days_inactive} />
                      </td>
                      {/* Health */}
                      <td style={{ ...TD, padding: "10px 12px", minWidth: 100 }}>
                        <HealthBar score={a.health} />
                      </td>
                      {/* Expand */}
                      <td style={{ ...TD, padding: "10px 8px", textAlign: "center" }}>
                        <Expand style={{ width: 14, height: 14, color: "var(--kk-ink-faint)", transition: "transform 200ms", transform: isExpanded ? "rotate(180deg)" : "none", display: "inline-block" }} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: rowBg }}>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <AgentDetailPanel a={a} onTestToggled={handleTestToggled} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

function RevenueTab({ agents }: { agents: AgentRow[] }) {
  const [revenueView, setRevenueView] = useState<"confirmed" | "by_plan">("confirmed");

  const stats = useMemo(() => {
    const realAgents = agents.filter(a => !a.is_test_account);
    const testCount = agents.length - realAgents.length;

    // Confirmed paid = status strictly "active"
    const confirmedByPlan: Record<string, number> = {};
    let confirmedMrr = 0;
    const paidUsers: AgentRow[] = [];
    for (const a of realAgents) {
      if (a.subscription_status === "active" && a.subscription_plan) {
        confirmedByPlan[a.subscription_plan] = (confirmedByPlan[a.subscription_plan] ?? 0) + 1;
        confirmedMrr += MRR_BY_PLAN[a.subscription_plan] ?? 0;
        paidUsers.push(a);
      }
    }
    paidUsers.sort((a, b) => {
      const da = a.subscription_activated_at ? new Date(a.subscription_activated_at).getTime() : 0;
      const db = b.subscription_activated_at ? new Date(b.subscription_activated_at).getTime() : 0;
      return db - da;
    });

    // By plan = anyone with a plan name assigned, regardless of trial/beta/active
    const byPlanAll: Record<string, number> = {};
    let potentialMrr = 0;
    const byPlanUsers: AgentRow[] = [];
    for (const a of realAgents) {
      if (a.subscription_plan) {
        byPlanAll[a.subscription_plan] = (byPlanAll[a.subscription_plan] ?? 0) + 1;
        potentialMrr += MRR_BY_PLAN[a.subscription_plan] ?? 0;
        byPlanUsers.push(a);
      }
    }
    byPlanUsers.sort((a, b) => {
      const planOrder = ["elite", "platinum", "gold", "silver"];
      const pa = planOrder.indexOf(a.subscription_plan ?? "");
      const pb = planOrder.indexOf(b.subscription_plan ?? "");
      if (pa !== pb) return pa - pb;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    const totalPaid = agents.filter(a => a.subscription_status === "active").length;
    const totalTrialBeta = realAgents.filter(a => a.subscription_status === "trial" || a.subscription_status === "beta").length;
    const totalExpired = realAgents.filter(a => a.subscription_status === "expired").length;

    const expiringTrials = realAgents
      .filter(a => (a.subscription_status === "trial" || a.subscription_status === "beta") && a.trial_days_left !== null && a.trial_days_left >= 0)
      .sort((a, b) => (a.trial_days_left ?? 99) - (b.trial_days_left ?? 99));

    const conversionRate = (totalPaid + totalExpired) > 0
      ? Math.round((totalPaid / (totalPaid + totalExpired)) * 100)
      : null;

    return { confirmedByPlan, confirmedMrr, byPlanAll, potentialMrr, paidUsers, byPlanUsers, totalPaid, totalTrialBeta, totalExpired, expiringTrials, conversionRate, testCount };
  }, [agents]);

  const isConfirmed = revenueView === "confirmed";
  const displayByPlan = isConfirmed ? stats.confirmedByPlan : stats.byPlanAll;
  const displayMrr = isConfirmed ? stats.confirmedMrr : stats.potentialMrr;

  return (
    <div className="space-y-8">
      {/* Toggle + test exclusion note */}
      <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", width: "fit-content" }}>
        {(["confirmed", "by_plan"] as const).map(v => (
          <button
            key={v}
            onClick={() => setRevenueView(v)}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              background: revenueView === v ? "var(--kk-surface)" : "transparent",
              color: revenueView === v ? "var(--kk-ink)" : "var(--kk-ink-mute)",
              boxShadow: revenueView === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
            {v === "confirmed" ? "Confirmed paid" : "By plan"}
          </button>
        ))}
      </div>
      {stats.testCount > 0 && (
        <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          {stats.testCount} test account{stats.testCount !== 1 ? "s" : ""} excluded
        </p>
      )}
      </div>

      {/* MRR breakdown */}
      <section>
        <div className="flex items-baseline gap-4 mb-5">
          <div>
            <p className="kk-overline mb-1">{isConfirmed ? "Monthly recurring revenue" : "Potential MRR (by plan)"}</p>
            <p className="font-bold tabular-nums" style={{ fontSize: "2.2rem", lineHeight: 1, color: "var(--kk-blue)" }}>RM{displayMrr.toLocaleString()}</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>ARR est. RM{(displayMrr * 12).toLocaleString()}</p>
          </div>
          <div className="ml-auto flex gap-6 text-right">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Paid</p>
              <p className="tabular-nums font-bold text-[1.4rem]" style={{ color: "var(--kk-ink)" }}>{stats.totalPaid}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Trial/Beta</p>
              <p className="tabular-nums font-bold text-[1.4rem]" style={{ color: "var(--kk-ink)" }}>{stats.totalTrialBeta}</p>
            </div>
            {stats.conversionRate !== null && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-ink-faint)" }}>Conv. rate</p>
                <p className="tabular-nums font-bold text-[1.4rem]" style={{ color: stats.conversionRate >= 30 ? "#1F8B4C" : "#92400E" }}>{stats.conversionRate}%</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
          {["silver", "gold", "platinum", "elite"].map((plan, i) => {
            const count = displayByPlan[plan] ?? 0;
            const planMrr = count * (MRR_BY_PLAN[plan] ?? 0);
            const planMeta = PLAN_COLOR[plan];
            const maxPlanMrr = Math.max(...["silver", "gold", "platinum", "elite"].map(p => (displayByPlan[p] ?? 0) * (MRR_BY_PLAN[p] ?? 0)), 1);
            return (
              <div key={plan} className="flex items-center gap-4 px-5 py-4" style={{ background: "var(--kk-surface)", borderTop: i > 0 ? "1px solid var(--kk-line)" : "none" }}>
                <div style={{ width: 72, flexShrink: 0 }}>
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg" style={{ background: planMeta.bg, color: planMeta.text }}>{PLAN_LABEL[plan]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{count} user{count !== 1 ? "s" : ""} × RM{MRR_BY_PLAN[plan]}/mo</p>
                    <p className="tabular-nums font-bold text-[13px]" style={{ color: "var(--kk-ink)" }}>RM{planMrr.toLocaleString()}</p>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "var(--kk-line)" }}>
                    <div style={{ width: `${planMrr > 0 ? Math.max(4, Math.round((planMrr / maxPlanMrr) * 100)) : 0}%`, height: "100%", background: planMeta.bar, borderRadius: 99, transition: "width 600ms ease" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confirmed paid: show paid subscribers list */}
      {isConfirmed && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="kk-overline">Paid subscribers ({stats.paidUsers.length})</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>Confirmed active subscriptions, newest first.</p>
            </div>
            {stats.paidUsers.length > 0 && (
              <button
                onClick={() => { const emails = stats.paidUsers.filter(a => a.email).map(a => a.email).join(", "); navigator.clipboard.writeText(emails); toast.success("Emails copied"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
                <Copy className="w-3 h-3" /> Copy all emails
              </button>
            )}
          </div>
          {stats.paidUsers.length === 0 ? (
            <div className="rounded-2xl px-5 py-6 text-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>No confirmed paid subscribers yet.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
              {stats.paidUsers.map((a, i) => {
                const planMeta = PLAN_COLOR[a.subscription_plan ?? ""] ?? { bg: "rgba(110,110,115,0.10)", text: "#6E6E73" };
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? "var(--kk-surface)" : "var(--kk-surface-2)", borderTop: i > 0 ? "1px solid var(--kk-line)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{a.name || "—"}</p>
                      <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{a.email}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: planMeta.bg, color: planMeta.text }}>
                      {PLAN_LABEL[a.subscription_plan ?? ""] ?? a.subscription_plan}
                    </span>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold" style={{ color: "var(--kk-ink-mute)" }}>
                        {a.subscription_activated_at ? `Since ${fmtDate(a.subscription_activated_at)}` : "No date recorded"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* By plan: show all users with a plan assigned */}
      {!isConfirmed && (
        <section>
          <div className="mb-3">
            <p className="kk-overline">All users with a plan ({stats.byPlanUsers.length})</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>Includes trial, beta, and paid users who have a plan assigned.</p>
          </div>
          {stats.byPlanUsers.length === 0 ? (
            <div className="rounded-2xl px-5 py-6 text-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>No users with a plan assigned.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
              {stats.byPlanUsers.map((a, i) => {
                const planMeta = PLAN_COLOR[a.subscription_plan ?? ""] ?? { bg: "rgba(110,110,115,0.10)", text: "#6E6E73" };
                const statusMeta = STATUS_STYLE[a.subscription_status ?? ""];
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? "var(--kk-surface)" : "var(--kk-surface-2)", borderTop: i > 0 ? "1px solid var(--kk-line)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{a.name || "—"}</p>
                      <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{a.email}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: planMeta.bg, color: planMeta.text }}>
                      {PLAN_LABEL[a.subscription_plan ?? ""] ?? a.subscription_plan}
                    </span>
                    {statusMeta && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                    )}
                    {a.subscription_activated_at && (
                      <p className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-mute)" }}>
                        Since {fmtDate(a.subscription_activated_at)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Expiring trials — conversion window */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="kk-overline">Trial / beta users ({stats.expiringTrials.length})</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>Sorted by trial expiry. These are your conversion opportunities.</p>
          </div>
          {stats.expiringTrials.length > 0 && (
            <button
              onClick={() => { const emails = stats.expiringTrials.filter(a => a.email).map(a => a.email).join(", "); navigator.clipboard.writeText(emails); toast.success("Emails copied"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}>
              <Copy className="w-3 h-3" /> Copy all emails
            </button>
          )}
        </div>
        {stats.expiringTrials.length === 0 ? (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>No trial or beta users right now.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
            {stats.expiringTrials.map((a, i) => {
              const days = a.trial_days_left;
              const urgent = days !== null && days <= 3;
              const expired = days !== null && days < 0;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? "var(--kk-surface)" : "var(--kk-surface-2)", borderTop: i > 0 ? "1px solid var(--kk-line)" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{a.name || "—"}</p>
                    <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{a.email} · {a.potential_listing_count + a.existing_listing_count} cards</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{
                    background: expired ? "rgba(110,110,115,0.10)" : urgent ? "rgba(220,38,38,0.10)" : "rgba(255,149,0,0.10)",
                    color: expired ? "#6E6E73" : urgent ? "#DC2626" : "#92400E",
                  }}>
                    {expired ? `Expired ${Math.abs(days!)}d ago` : days === 0 ? "Expires today" : `${days}d left`}
                  </span>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: STATUS_STYLE[a.subscription_status ?? ""]?.color ?? "var(--kk-ink-mute)" }}>
                    {STATUS_STYLE[a.subscription_status ?? ""]?.label ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Ops Tab ──────────────────────────────────────────────────────────────────

function OpsTab({ links: initialLinks, feedback: initialFeedback, invites: initialInvites, waitlist, openFeedbackCount }: {
  links: LinkRow[]; feedback: FeedbackRow[]; invites: InviteRow[]; waitlist: WaitlistRow[]; openFeedbackCount: number;
}) {
  const [sub, setSub] = useState<"links" | "feedback" | "invites" | "waitlist" | "dev">("links");
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [feedback, setFeedback] = useState<FeedbackRow[]>(initialFeedback);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [newLabel, setNewLabel] = useState(""); const [newSlug, setNewSlug] = useState(""); const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSends, setEditingSends] = useState<string | null>(null); const [sendsInput, setSendsInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [inviteInput, setInviteInput] = useState(""); const [addingInvites, setAddingInvites] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const openFeedback = feedback.filter(f => !f.resolved);
  const resolvedFeedback = feedback.filter(f => f.resolved);

  function autoSlug(label: string) { return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  async function handleCreate() {
    if (!newLabel.trim() || !newSlug.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: newLabel.trim(), slug: newSlug.trim() }) });
    if (res.ok) { const link = await res.json(); setLinks(prev => [{ ...link, clicks: 0, signups: 0, sends: 0 }, ...prev]); setNewLabel(""); setNewSlug(""); toast.success("Link created"); }
    else { const body = await res.json().catch(() => ({})); toast.error(body.error ?? "Failed"); }
    setCreating(false);
  }

  async function saveSends(id: string) {
    const n = parseInt(sendsInput, 10); if (isNaN(n) || n < 0) return;
    const res = await fetch("/api/admin/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, sends_count: n }) });
    if (res.ok) { setLinks(prev => prev.map(l => l.id === id ? { ...l, sends: n } : l)); toast.success("Sends updated"); }
    else toast.error("Failed to update");
    setEditingSends(null);
  }

  function copyLink(slug: string, id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/api/r/${slug}`);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleResolved(id: string, current: boolean) {
    const res = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, resolved: !current }) });
    if (res.ok) setFeedback(prev => prev.map(f => f.id === id ? { ...f, resolved: !current } : f));
    else toast.error("Failed to update");
  }

  async function handleAddInvites() {
    const emails = inviteInput.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes("@"));
    if (emails.length === 0) return;
    setAddingInvites(true);
    const res = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) });
    if (res.ok) { const body = await res.json(); toast.success(`${body.added} invite${body.added !== 1 ? "s" : ""} added`); setInviteInput(""); const fresh = await fetch("/api/admin/invites").then(r => r.json()).catch(() => invites); setInvites(fresh); }
    else { const body = await res.json().catch(() => ({})); toast.error(body.error ?? "Failed"); }
    setAddingInvites(false);
  }

  async function handleRemoveInvite(email: string) {
    setRemovingEmail(email);
    const res = await fetch("/api/admin/invites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    if (res.ok) { setInvites(prev => prev.filter(i => i.email !== email)); toast.success("Invite removed"); }
    else toast.error("Failed to remove");
    setRemovingEmail(null);
  }

  const subTabs: [typeof sub, string][] = [
    ["links", `Links (${links.length})`],
    ["feedback", `Feedback${openFeedbackCount ? ` (${openFeedbackCount})` : ""}`],
    ["invites", `Invites (${invites.length})`],
    ["waitlist", `Waitlist (${waitlist.length})`],
    ["dev", "Dev Tools"],
  ];

  return (
    <div>
      <div className="flex gap-1 p-1 rounded-xl mb-6 flex-wrap" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
        {subTabs.map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{ background: sub === id ? "var(--kk-ink)" : "transparent", color: sub === id ? "#fff" : "var(--kk-ink-mute)" }}>
            {label}
          </button>
        ))}
      </div>

      {sub === "links" && (
        <div>
          <div className="flex gap-2 mb-5 flex-wrap">
            <input value={newLabel} onChange={e => { setNewLabel(e.target.value); setNewSlug(autoSlug(e.target.value)); }} placeholder="Label" className="flex-1 min-w-[160px] rounded-xl px-3.5 py-2.5 outline-none" style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }} />
            <input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug" className="w-32 rounded-xl px-3.5 py-2.5 outline-none font-mono" style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }} />
            <button onClick={handleCreate} disabled={creating || !newLabel.trim() || !newSlug.trim()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-85 disabled:opacity-40" style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-sm)" }}>
              <Plus className="w-3.5 h-3.5" />{creating ? "Creating…" : "Create"}
            </button>
          </div>
          {links.length === 0 ? <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No links yet.</p> : (
            <div className="space-y-3">
              {links.map(link => {
                const clickRate = link.sends > 0 ? ((link.clicks / link.sends) * 100).toFixed(1) : "—";
                const convRate = link.clicks > 0 ? ((link.signups / link.clicks) * 100).toFixed(1) : "—";
                const maxVal = Math.max(link.sends, 1);
                return (
                  <div key={link.id} className="rounded-2xl p-5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                      <div>
                        <p className="font-semibold" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>{link.label}</p>
                        <p className="font-mono mt-0.5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>/api/r/{link.slug}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => copyLink(link.slug, link.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", fontSize: "var(--kk-xs)", fontWeight: 500 }}>
                          {copiedId === link.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copiedId === link.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "Sent", value: link.sends, color: "var(--kk-ink)", editable: true },
                        { label: "Clicked", value: link.clicks, color: "#0071E3", rate: clickRate },
                        { label: "Signed up", value: link.signups, color: "var(--kk-green)", rate: convRate },
                      ].map(col => (
                        <div key={col.label} className="rounded-xl p-3" style={{ background: "var(--kk-surface-2)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>{col.label}</p>
                            {col.editable ? (
                              editingSends === link.id
                                ? <div className="flex items-center gap-1"><input autoFocus value={sendsInput} onChange={e => setSendsInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveSends(link.id); if (e.key === "Escape") setEditingSends(null); }} className="w-14 text-right rounded px-1 outline-none" style={{ fontSize: "var(--kk-xs)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-surface)", color: "var(--kk-ink)" }} /><button onClick={() => saveSends(link.id)} style={{ fontSize: "var(--kk-xs)", color: "var(--kk-green)", fontWeight: 600 }}>✓</button></div>
                                : <button onClick={() => { setEditingSends(link.id); setSendsInput(String(link.sends)); }} className="opacity-50 hover:opacity-100 transition-opacity" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}><Edit2 className="w-2.5 h-2.5" /></button>
                            ) : <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>{col.rate}%</p>}
                          </div>
                          <p className="tabular-nums font-bold" style={{ fontSize: "1.3rem", color: col.color, lineHeight: 1 }}>{col.value}</p>
                          <FunnelBar value={col.value} max={maxVal} color={col.color} />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
                      <span>{link.sends > 0 ? `${link.sends} sent` : "No sends yet"}</span>
                      <ChevronRight className="w-3 h-3" /><span>{link.clicks} clicked</span>
                      <ChevronRight className="w-3 h-3" /><span>{link.signups} signed up</span>
                      {link.sends > 0 && link.signups > 0 && <span style={{ marginLeft: 4, color: "var(--kk-green)", fontWeight: 600 }}>({((link.signups / link.sends) * 100).toFixed(1)}% end-to-end)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sub === "feedback" && (
        <div className="space-y-3">
          {feedback.length === 0 && <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No feedback yet.</p>}
          {[...openFeedback, ...resolvedFeedback].map(f => {
            const cat = CATEGORY_STYLE[f.category] ?? CATEGORY_STYLE.question;
            const date = new Date(f.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={f.id} className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", opacity: f.resolved ? 0.5 : 1 }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{f.agent_name || f.agent_email || "Unknown"}</span>
                    {f.page_url && <span className="text-[11px] font-mono" style={{ color: "var(--kk-ink-faint)" }}>{f.page_url}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{date}</span>
                    <button onClick={() => toggleResolved(f.id, f.resolved)} title={f.resolved ? "Mark open" : "Mark resolved"} className="transition-opacity hover:opacity-70">
                      <CheckCircle2 className="w-4 h-4" style={{ color: f.resolved ? "var(--kk-green)" : "var(--kk-line-strong)" }} />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kk-ink-mute)" }}>{f.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {sub === "invites" && (
        <div>
          <div className="mb-5">
            <textarea value={inviteInput} onChange={e => setInviteInput(e.target.value)} placeholder={"Paste emails, one per line or comma-separated\nagent@era.com\nagent2@iqigroup.com"} rows={4} className="w-full rounded-xl px-3.5 py-2.5 outline-none font-mono resize-none mb-2" style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }} />
            <button onClick={handleAddInvites} disabled={addingInvites || !inviteInput.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-opacity hover:opacity-85 disabled:opacity-40" style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-sm)" }}>
              <Plus className="w-3.5 h-3.5" />{addingInvites ? "Adding…" : "Add invites"}
            </button>
          </div>
          <div className="space-y-2">
            {invites.length === 0 && <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No invites yet.</p>}
            {invites.map(inv => (
              <div key={inv.id} className="rounded-2xl px-5 py-3 flex items-center gap-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[13px]" style={{ color: "var(--kk-ink)" }}>{inv.email}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>Invited {fmtDate(inv.invited_at)}</p>
                </div>
                {inv.used_at ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.10)", color: "#065F46" }}>Used</span>
                  : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.12)", color: "#A16207" }}>Pending</span>}
                <button onClick={() => handleRemoveInvite(inv.email)} disabled={removingEmail === inv.email} className="text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: "#DC2626" }}>
                  {removingEmail === inv.email ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "waitlist" && (
        <div className="space-y-2">
          {waitlist.length === 0 && <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No waitlist entries yet.</p>}
          {waitlist.map(w => (
            <div key={w.id} className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
              <div className="flex-1 min-w-[160px]">
                <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{w.name || "—"}</p>
                <p className="font-mono text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{w.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {w.ren_number && <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>{w.ren_number}</span>}
                {w.expected_spend && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#4338CA" }}>RM{w.expected_spend}/mo</span>}
              </div>
              <span className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-faint)" }}>{fmtDate(w.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {sub === "dev" && (
        <div className="rounded-2xl p-5" style={{ background: "var(--kk-surface)", border: "1px solid #FECACA" }}>
          <p className="font-semibold text-[13px] mb-1" style={{ color: "#DC2626" }}>Reset my account to Day 1</p>
          <p className="text-[12px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>Deletes all your leads, tenancies, tenant profiles, and properties. Resets streak and trial to fresh start. Cannot be undone.</p>
          <button onClick={async () => {
            if (!confirm("Delete all your data and reset to Day 1? This cannot be undone.")) return;
            setResetting(true);
            try {
              const result = await adminResetMyAccount();
              if (result.ok) { toast.success("Account reset. Reloading..."); setTimeout(() => window.location.href = "/home", 1200); }
              else toast.error("Reset failed");
            } catch { toast.error("Reset failed"); } finally { setResetting(false); }
          }} disabled={resetting} className="px-4 py-2 rounded-xl font-semibold text-[13px] transition-opacity hover:opacity-80 disabled:opacity-40" style={{ background: "#DC2626", color: "#fff" }}>
            {resetting ? "Resetting…" : "Reset my account"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main AdminView ────────────────────────────────────────────────────────────

export function AdminView({ funnel, links, feedback, agents, invites, waitlist, rawLeads, rawTenancies, rawFeedback }: {
  funnel: Funnel; links: LinkRow[]; feedback: FeedbackRow[]; agents: AgentRow[];
  invites: InviteRow[]; waitlist: WaitlistRow[];
  rawLeads: RawLead[]; rawTenancies: RawTenancy[]; rawFeedback: RawFeedbackItem[];
}) {
  const [tab, setTab] = useState<"health" | "users" | "revenue" | "ops">("health");
  const [usersSegment, setUsersSegment] = useState<Segment | "all">("all");

  const openFeedbackCount = feedback.filter(f => !f.resolved).length;

  // Always-visible KPI strip
  const kpi = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 86400000;
    const active7d = agents.filter(a => a.days_inactive !== null && a.days_inactive <= 6).length;
    const activated = agents.filter(a => a.potential_listing_count + a.existing_listing_count > 0).length;
    const mrr = agents.reduce((s, a) => s + (a.subscription_status === "active" && a.subscription_plan ? (MRR_BY_PLAN[a.subscription_plan] ?? 0) : 0), 0);
    const thisWeekCutoff = now - weekMs;
    const lastWeekCutoff = now - 2 * weekMs;
    const signupsThisWeek = agents.filter(a => new Date(a.joined_at).getTime() >= thisWeekCutoff).length;
    const signupsLastWeek = agents.filter(a => { const t = new Date(a.joined_at).getTime(); return t >= lastWeekCutoff && t < thisWeekCutoff; }).length;
    const activationRate = funnel.total > 0 ? Math.round((activated / funnel.total) * 100) : 0;
    return { active7d, mrr, signupsThisWeek, signupsLastWeek, activationRate, activated };
  }, [agents, funnel]);

  function handleSegmentClick(seg: Segment | "all") {
    setUsersSegment(seg);
    setTab("users");
  }

  const tabs: [typeof tab, string][] = [
    ["health", "Health"],
    ["users", `Users (${agents.length})`],
    ["revenue", "Revenue"],
    ["ops", `Ops${openFeedbackCount ? ` (${openFeedbackCount})` : ""}`],
  ];

  return (
    <div className="px-6 lg:px-12 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="serif" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
          Admin Dashboard
        </h1>
        <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{ background: tab === id ? "var(--kk-ink)" : "transparent", color: tab === id ? "#fff" : "var(--kk-ink-mute)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip — always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Total users" value={funnel.total} icon={<Users className="w-3.5 h-3.5" />} trend={{ now: kpi.signupsThisWeek, prev: kpi.signupsLastWeek }} />
        <KpiCard label="Active 7d" value={kpi.active7d} sub={`${funnel.total > 0 ? Math.round((kpi.active7d / funnel.total) * 100) : 0}% of users`} color="var(--kk-green)" icon={<Activity className="w-3.5 h-3.5" />} />
        <KpiCard label="Activated" value={`${kpi.activationRate}%`} sub={`${kpi.activated} added a card`} color="#0071E3" icon={<Zap className="w-3.5 h-3.5" />} />
        <KpiCard label="Paid users" value={funnel.active} sub={`${funnel.trial + funnel.beta} in trial/beta`} icon={<DollarSign className="w-3.5 h-3.5" />} />
        <KpiCard label="MRR est." value={`RM${kpi.mrr}`} sub={`ARR RM${kpi.mrr * 12}`} color="var(--kk-blue)" icon={<TrendingUp className="w-3.5 h-3.5" />} />
        <KpiCard label="Feedback" value={openFeedbackCount} sub="open items" color={openFeedbackCount > 0 ? "var(--kk-amber)" : "var(--kk-ink)"} icon={<MessageSquare className="w-3.5 h-3.5" />} />
      </div>

      {/* Tab content */}
      {tab === "health" && (
        <HealthTab agents={agents} funnel={funnel} rawLeads={rawLeads} rawTenancies={rawTenancies} onSelectSegment={handleSegmentClick} />
      )}
      {tab === "users" && (
        <UsersTab agents={agents} rawLeads={rawLeads} rawTenancies={rawTenancies} rawFeedback={rawFeedback} initialSegment={usersSegment} />
      )}
      {tab === "revenue" && <RevenueTab agents={agents} />}
      {tab === "ops" && (
        <OpsTab links={links} feedback={feedback} invites={invites} waitlist={waitlist} openFeedbackCount={openFeedbackCount} />
      )}
    </div>
  );
}
