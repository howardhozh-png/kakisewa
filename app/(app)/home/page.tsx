import Link from "next/link";
import { Upload, Users, RefreshCw, ChevronRight, AlertCircle } from "lucide-react";
import { getAgentProfile, getHomeDashboardStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [agent, stats] = await Promise.all([
    getAgentProfile(),
    getHomeDashboardStats(),
  ]);
  const firstName = agent.name ? agent.name.trim().split(" ")[0] : null;

  const STEPS = [
    {
      number: 1,
      icon: Upload,
      title: "New Owners",
      description: "Upload and contact owners. Automatically records who is interested.",
      href: "/new-owners",
      accent: "#1F8B4C",
      soft: "var(--kk-green-soft)",
      crumb: { parent: "New Owners", child: "Outreach" },
      stat: `${stats.totalOwners} owner${stats.totalOwners !== 1 ? "s" : ""} tracked`,
      alert: stats.uncontacted > 0 ? `${stats.uncontacted} not yet contacted` : null,
    },
    {
      number: 2,
      icon: Users,
      title: "Active Deals",
      description: "Build a tenant package for interested owners and close the deal.",
      href: "/new-owners?tab=pipeline",
      accent: "var(--kk-blue)",
      soft: "var(--kk-blue-soft)",
      crumb: { parent: "New Owners", child: "Active Deals" },
      stat: `${stats.pipeline} deal${stats.pipeline !== 1 ? "s" : ""} in pipeline`,
      alert: stats.listedWithoutTenant > 0 ? `${stats.listedWithoutTenant} listed, awaiting tenant` : null,
    },
    {
      number: 3,
      icon: RefreshCw,
      title: "Existing Contracts",
      description: "Get notified before contract expiry and capture renewal income.",
      href: "/existing-contracts",
      accent: "#C2410C",
      soft: "rgba(234,88,12,0.10)",
      crumb: { parent: "Existing Contracts", child: undefined },
      stat: `${stats.activeContracts} active contract${stats.activeContracts !== 1 ? "s" : ""}`,
      alert: stats.expiringIn60 > 0 ? `${stats.expiringIn60} expiring within 60 days` : null,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 lg:py-24">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--kk-ink-faint)" }}>
          Getting started
        </p>
        <h1 className="serif text-[38px] lg:text-[46px] leading-tight tracking-tight mb-4" style={{ color: "var(--kk-ink)" }}>
          {firstName ? `Welcome, ${firstName}.` : "Welcome to kakisewa."}
        </h1>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--kk-ink-mute)", maxWidth: 480 }}>
          kakisewa is your business partner. Three steps to maximize your income.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.number}
              href={step.href}
              className="kk-card kk-card-hover flex items-start gap-5 p-6 relative overflow-hidden"
              style={{ textDecoration: "none" }}
            >
              {/* Corner breadcrumb */}
              <span
                className="absolute top-0 right-0 flex items-center gap-0.5 px-3 py-1.5 rounded-bl-2xl text-[10px] font-medium tracking-wide"
                style={{ background: "rgba(0,0,0,0.045)", color: "var(--kk-ink-faint)" }}
              >
                {step.crumb.parent}
                {step.crumb.child && (
                  <>
                    <ChevronRight className="w-2.5 h-2.5" />
                    {step.crumb.child}
                  </>
                )}
              </span>

              {/* Number badge */}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[15px] font-bold tabular-nums"
                style={{ background: step.soft, color: step.accent }}
              >
                {step.number}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-[16px] font-semibold leading-snug mb-1 pr-20" style={{ color: "var(--kk-ink)", letterSpacing: "-0.012em" }}>
                  {step.title}
                </h2>
                <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--kk-ink-mute)" }}>
                  {step.description}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink-faint)" }}>
                    {step.stat}
                  </span>
                  {step.alert && (
                    <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: step.accent }}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      {step.alert}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
