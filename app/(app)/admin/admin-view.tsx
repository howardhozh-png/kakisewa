"use client";

import { useState, useMemo } from "react";
import { Plus, Copy, Check, ExternalLink, Edit2, ChevronRight, CheckCircle2, ChevronUp, ChevronDown, Search, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { adminResetMyAccount } from "@/lib/actions";

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
  beta: number;
  beta_frozen: number;
  trial: number;
  expired: number;
  active: number;
  unset: number;
}

interface FeedbackRow {
  id: string;
  agent_name: string | null;
  agent_email: string | null;
  category: string;
  message: string;
  page_url: string | null;
  resolved: boolean;
  created_at: string;
}

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  ren_number: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_days_left: number | null;
  joined_at: string;
  last_login_at: string | null;
  days_inactive: number | null;
  potential_listing_count: number;
  outreaches_sent: number;
  my_listing_count: number;
  existing_listing_count: number;
  feedback_count: number;
}

interface InviteRow {
  id: string;
  email: string;
  invited_at: string;
  used_at: string | null;
}

interface WaitlistRow {
  id: string;
  name: string | null;
  email: string;
  ren_number: string | null;
  expected_spend: string | null;
  created_at: string;
}

function FunnelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "var(--kk-line)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 600ms ease" }} />
    </div>
  );
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  bug:        { bg: "rgba(220,38,38,0.10)",  color: "#DC2626", label: "🐛 Bug" },
  suggestion: { bg: "rgba(234,179,8,0.12)",  color: "#A16207", label: "💡 Suggestion" },
  question:   { bg: "rgba(99,102,241,0.12)", color: "#4338CA", label: "❓ Question" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  beta:        { bg: "rgba(139,92,246,0.10)",  color: "#6d28d9", label: "Beta" },
  beta_frozen: { bg: "rgba(59,130,246,0.10)",  color: "#1d4ed8", label: "Frozen" },
  trial:       { bg: "rgba(16,185,129,0.10)",  color: "#065F46", label: "Trial" },
  expired:     { bg: "rgba(220,38,38,0.10)",   color: "#DC2626", label: "Expired" },
  active:      { bg: "rgba(0,113,227,0.10)",   color: "#0071E3", label: "Paid" },
};

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  silver:   { bg: "rgba(107,114,128,0.12)", color: "#374151" },
  platinum: { bg: "rgba(11,31,74,0.12)",    color: "#0b1f4a" },
  elite:    { bg: "rgba(107,61,30,0.12)",   color: "#6b3d1e" },
};

type SortCol = "name" | "joined_at" | "last_login_at" | "days_inactive" | "potential_listing_count" | "outreaches_sent" | "my_listing_count" | "existing_listing_count" | "feedback_count";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function InactiveBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: "var(--kk-ink-faint)", fontSize: 12 }}>Never</span>;
  const color = days <= 6 ? "#1F8B4C" : days <= 13 ? "#92400E" : "#DC2626";
  const bg = days <= 6 ? "rgba(52,199,89,0.10)" : days <= 13 ? "rgba(255,149,0,0.12)" : "rgba(220,38,38,0.10)";
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums" style={{ background: bg, color }}>
      {days === 0 ? "Today" : `${days}d ago`}
    </span>
  );
}

function NumCell({ value }: { value: number }) {
  return (
    <span className="tabular-nums text-[13px]" style={{ color: value === 0 ? "var(--kk-ink-faint)" : "var(--kk-ink)", fontWeight: value > 0 ? 600 : 400 }}>
      {value === 0 ? "—" : value}
    </span>
  );
}

function AgentsTable({ agents }: { agents: AgentRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortCol, setSortCol] = useState<SortCol>("days_inactive");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let rows = agents;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(a => (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q) || (a.agency ?? "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") rows = rows.filter(a => a.subscription_status === statusFilter);
    if (activityFilter === "active") rows = rows.filter(a => a.days_inactive !== null && a.days_inactive <= 6);
    else if (activityFilter === "risk") rows = rows.filter(a => a.days_inactive !== null && a.days_inactive >= 7 && a.days_inactive <= 13);
    else if (activityFilter === "inactive") rows = rows.filter(a => a.days_inactive !== null && a.days_inactive >= 14);
    else if (activityFilter === "never") rows = rows.filter(a => a.days_inactive === null);

    return [...rows].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortCol === "name") { av = (a.name ?? "").toLowerCase(); bv = (b.name ?? "").toLowerCase(); }
      else if (sortCol === "joined_at") { av = a.joined_at; bv = b.joined_at; }
      else if (sortCol === "last_login_at") { av = a.last_login_at ?? ""; bv = b.last_login_at ?? ""; }
      else if (sortCol === "days_inactive") { av = a.days_inactive ?? 9999; bv = b.days_inactive ?? 9999; }
      else if (sortCol === "potential_listing_count") { av = a.potential_listing_count; bv = b.potential_listing_count; }
      else if (sortCol === "outreaches_sent") { av = a.outreaches_sent; bv = b.outreaches_sent; }
      else if (sortCol === "my_listing_count") { av = a.my_listing_count; bv = b.my_listing_count; }
      else if (sortCol === "existing_listing_count") { av = a.existing_listing_count; bv = b.existing_listing_count; }
      else if (sortCol === "feedback_count") { av = a.feedback_count; bv = b.feedback_count; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [agents, search, statusFilter, activityFilter, sortCol, sortDir]);

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Phone", "Agency", "REN", "Status", "Plan", "Joined", "Last Login", "Days Inactive", "Potential Listing", "Outreaches Sent", "My Listing", "Existing Listing", "Feedback"].join(","),
      ...filtered.map(a => [
        a.name ?? "", a.email ?? "", a.phone ?? "", a.agency ?? "",
        a.ren_number ?? "", a.subscription_status ?? "", a.subscription_plan ?? "",
        fmtDate(a.joined_at), fmtDate(a.last_login_at),
        a.days_inactive ?? "Never",
        a.potential_listing_count, a.outreaches_sent, a.my_listing_count, a.existing_listing_count, a.feedback_count,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `agents-${Date.now()}.csv`; el.click();
  }

  const Th = ({ col, label, right }: { col: SortCol; label: string; right?: boolean }) => (
    <th
      onClick={() => toggleSort(col)}
      className="select-none cursor-pointer whitespace-nowrap px-4 py-3 text-left"
      style={{ fontSize: 11, fontWeight: 600, color: sortCol === col ? "var(--kk-ink)" : "var(--kk-ink-mute)", textAlign: right ? "right" : "left", borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--kk-ink-faint)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, agency..."
            className="w-full pl-8 pr-8 py-2 rounded-xl outline-none text-[12px]"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kk-ink-faint)" }}>
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl px-3 py-2 outline-none text-[12px] font-medium"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
        >
          <option value="all">All statuses</option>
          <option value="beta">Beta</option>
          <option value="beta_frozen">Frozen</option>
          <option value="trial">Trial</option>
          <option value="active">Paid</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={activityFilter}
          onChange={e => setActivityFilter(e.target.value)}
          className="rounded-xl px-3 py-2 outline-none text-[12px] font-medium"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
        >
          <option value="all">All activity</option>
          <option value="active">Active (last 7 days)</option>
          <option value="risk">At risk (7-13 days)</option>
          <option value="inactive">Inactive (14+ days)</option>
          <option value="never">Never logged in</option>
        </select>
        <span className="text-[12px] ml-1" style={{ color: "var(--kk-ink-faint)" }}>{filtered.length} of {agents.length}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => { const emails = filtered.filter(a => a.email).map(a => a.email).join(", "); navigator.clipboard.writeText(emails); toast.success(`${filtered.filter(a => a.email).length} emails copied`); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
          >
            <Copy className="w-3.5 h-3.5" /> Copy emails
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <Th col="name" label="Agent" />
                <th className="px-4 py-3 text-left whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-ink-mute)", borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>Status</th>
                <Th col="joined_at" label="Joined" />
                <Th col="last_login_at" label="Last Login" />
                <Th col="days_inactive" label="Inactive" />
                <Th col="potential_listing_count" label="Potential Listing" right />
                <Th col="outreaches_sent" label="Outreaches Sent" right />
                <Th col="my_listing_count" label="My Listing" right />
                <Th col="existing_listing_count" label="Existing Listing" right />
                <Th col="feedback_count" label="Feedback" right />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center" style={{ fontSize: 13, color: "var(--kk-ink-faint)", background: "var(--kk-surface)" }}>
                    No agents match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((a, i) => {
                const statusStyle = STATUS_STYLE[a.subscription_status ?? ""] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--kk-ink-mute)", label: "—" };
                const planStyle = a.subscription_plan ? PLAN_STYLE[a.subscription_plan] : null;
                const trialLabel = a.subscription_status === "trial" && a.trial_days_left !== null
                  ? (a.trial_days_left > 0 ? ` · ${a.trial_days_left}d left` : " · Expired") : "";
                const rowBg = i % 2 === 0 ? "var(--kk-surface)" : "var(--kk-surface-2)";
                const border = "1px solid var(--kk-line)";
                return (
                  <tr key={a.id} style={{ background: rowBg, borderTop: border }}>
                    <td className="px-4 py-3" style={{ minWidth: 180 }}>
                      <p className="font-semibold text-[13px] leading-tight" style={{ color: "var(--kk-ink)" }}>{a.name || "—"}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{a.email || "no email"}</p>
                      {a.agency && <p className="text-[10px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{a.agency}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}{trialLabel}
                        </span>
                        {planStyle && a.subscription_plan && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: planStyle.bg, color: planStyle.color }}>
                            {a.subscription_plan}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{fmtDate(a.joined_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{fmtDate(a.last_login_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><InactiveBadge days={a.days_inactive} /></td>
                    <td className="px-4 py-3 text-right"><NumCell value={a.potential_listing_count} /></td>
                    <td className="px-4 py-3 text-right"><NumCell value={a.outreaches_sent} /></td>
                    <td className="px-4 py-3 text-right"><NumCell value={a.my_listing_count} /></td>
                    <td className="px-4 py-3 text-right"><NumCell value={a.existing_listing_count} /></td>
                    <td className="px-4 py-3 text-right"><NumCell value={a.feedback_count} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminView({ funnel, links: initialLinks, feedback: initialFeedback, agents, invites: initialInvites, waitlist }: {
  funnel: Funnel; links: Link[]; feedback: FeedbackRow[]; agents: AgentRow[];
  invites: InviteRow[]; waitlist: WaitlistRow[];
}) {
  const [tab, setTab] = useState<"funnel" | "feedback" | "agents" | "invites" | "waitlist">("funnel");
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [feedback, setFeedback] = useState<FeedbackRow[]>(initialFeedback);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSends, setEditingSends] = useState<string | null>(null);
  const [sendsInput, setSendsInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [addingInvites, setAddingInvites] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

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
    { label: "Total accounts",    value: funnel.total,        color: "var(--kk-ink)" },
    { label: "Active beta",       value: funnel.beta,         color: "#8b5cf6" },
    { label: "Beta frozen",       value: funnel.beta_frozen,  color: "#3b82f6" },
    { label: "Active trial",      value: funnel.trial,        color: "var(--kk-green)" },
    { label: "Expired",           value: funnel.expired,      color: "#DC2626" },
    { label: "Paid subscribers",  value: funnel.active,       color: "#0071E3" },
    { label: "Legacy (no status)",value: funnel.unset,        color: "var(--kk-ink-faint)" },
  ];

  async function toggleResolved(id: string, current: boolean) {
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: !current }),
    });
    if (res.ok) {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, resolved: !current } : f));
    } else {
      toast.error("Failed to update");
    }
  }

  async function handleAddInvites() {
    const emails = inviteInput.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes("@"));
    if (emails.length === 0) return;
    setAddingInvites(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });
    if (res.ok) {
      const body = await res.json();
      toast.success(`${body.added} invite${body.added !== 1 ? "s" : ""} added`);
      setInviteInput("");
      const fresh = await fetch("/api/admin/invites").then(r => r.json()).catch(() => invites);
      setInvites(fresh);
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to add invites");
    }
    setAddingInvites(false);
  }

  async function handleRemoveInvite(email: string) {
    setRemovingEmail(email);
    const res = await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setInvites(prev => prev.filter(i => i.email !== email));
      toast.success("Invite removed");
    } else {
      toast.error("Failed to remove");
    }
    setRemovingEmail(null);
  }

  const openFeedback = feedback.filter(f => !f.resolved);
  const resolvedFeedback = feedback.filter(f => f.resolved);

  return (
    <div className="px-6 lg:px-12 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="serif" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
          Admin Dashboard
        </h1>
        <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          {(["funnel", "agents", "invites", "waitlist", "feedback"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all capitalize"
              style={{
                background: tab === t ? "var(--kk-ink)" : "transparent",
                color: tab === t ? "#fff" : "var(--kk-ink-mute)",
              }}>
              {t === "feedback" ? `Feedback${openFeedback.length ? ` (${openFeedback.length})` : ""}`
                : t === "agents" ? `Agents (${agents.length})`
                : t === "invites" ? `Invites (${invites.length})`
                : t === "waitlist" ? `Waitlist (${waitlist.length})`
                : "Funnel & Links"}
            </button>
          ))}
        </div>
      </div>

      {tab === "invites" && (
        <div>
          <p className="kk-overline mb-4">Invite List</p>
          <div className="mb-5">
            <textarea
              value={inviteInput}
              onChange={e => setInviteInput(e.target.value)}
              placeholder={"Paste emails, one per line or comma-separated\nagent@era.com\nagent2@iqigroup.com"}
              rows={4}
              className="w-full rounded-xl px-3.5 py-2.5 outline-none font-mono resize-none mb-2"
              style={{ fontSize: "var(--kk-sm)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
            />
            <button
              onClick={handleAddInvites}
              disabled={addingInvites || !inviteInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-sm)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              {addingInvites ? "Adding…" : "Add invites"}
            </button>
          </div>
          <div className="space-y-2">
            {invites.length === 0 && (
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No invites yet.</p>
            )}
            {invites.map(inv => {
              const date = new Date(inv.invited_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div key={inv.id} className="rounded-2xl px-5 py-3 flex items-center gap-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[13px]" style={{ color: "var(--kk-ink)" }}>{inv.email}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>Invited {date}</p>
                  </div>
                  {inv.used_at ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.10)", color: "#065F46" }}>
                      Used
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.12)", color: "#A16207" }}>
                      Pending
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveInvite(inv.email)}
                    disabled={removingEmail === inv.email}
                    className="text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#DC2626" }}
                  >
                    {removingEmail === inv.email ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "waitlist" && (
        <div>
          <p className="kk-overline mb-4">Waitlist ({waitlist.length})</p>
          {waitlist.length === 0 && (
            <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No waitlist entries yet.</p>
          )}
          <div className="space-y-2">
            {waitlist.map(w => {
              const date = new Date(w.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div key={w.id} className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-semibold text-[13px]" style={{ color: "var(--kk-ink)" }}>{w.name || "—"}</p>
                    <p className="font-mono text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{w.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {w.ren_number && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                        {w.ren_number}
                      </span>
                    )}
                    {w.expected_spend && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#4338CA" }}>
                        RM{w.expected_spend}/mo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--kk-ink-faint)" }}>{date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-3">
          {feedback.length === 0 && (
            <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>No feedback yet.</p>
          )}
          {[...openFeedback, ...resolvedFeedback].map(f => {
            const cat = CATEGORY_STYLE[f.category] ?? CATEGORY_STYLE.question;
            const date = new Date(f.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={f.id} className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", opacity: f.resolved ? 0.5 : 1 }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                      {cat.label}
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{f.agent_name || f.agent_email || "Unknown"}</span>
                    {f.page_url && (
                      <span className="text-[11px] font-mono" style={{ color: "var(--kk-ink-faint)" }}>{f.page_url}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{date}</span>
                    <button onClick={() => toggleResolved(f.id, f.resolved)} title={f.resolved ? "Mark open" : "Mark resolved"}
                      className="transition-opacity hover:opacity-70">
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

      {tab === "agents" && <AgentsTable agents={agents} />}

      {tab === "funnel" && <>
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

      {/* Dev Tools */}
      <section className="mt-12 pt-8" style={{ borderTop: "1px solid var(--kk-line)" }}>
        <p className="kk-overline mb-4">Dev Tools</p>
        <div className="rounded-2xl p-5" style={{ background: "var(--kk-surface)", border: "1px solid #FECACA" }}>
          <p className="font-semibold text-[13px] mb-1" style={{ color: "#DC2626" }}>Reset my account to Day 1</p>
          <p className="text-[12px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>
            Deletes all your leads, tenancies, tenant profiles, and properties. Resets streak and trial to fresh start. Cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Delete all your data and reset to Day 1? This cannot be undone.")) return;
              setResetting(true);
              try {
                const result = await adminResetMyAccount();
                if (result.ok) {
                  toast.success("Account reset. Reloading...");
                  setTimeout(() => window.location.href = "/home", 1200);
                } else {
                  toast.error("Reset failed");
                }
              } catch {
                toast.error("Reset failed");
              } finally {
                setResetting(false);
              }
            }}
            disabled={resetting}
            className="px-4 py-2 rounded-xl font-semibold text-[13px] transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "#DC2626", color: "#fff" }}
          >
            {resetting ? "Resetting…" : "Reset my account"}
          </button>
        </div>
      </section>
      </>}
    </div>
  );
}
