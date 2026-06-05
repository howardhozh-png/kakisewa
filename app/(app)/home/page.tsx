import Link from "next/link";
import { Upload, Users, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import { getAgentProfile, getHomeDashboardStats } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALERT_COLOR = "#991B1B";

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
      title: "Upload owner list and text them",
      description: "Once you upload the list, it will be here forever and you'll never lose track of leads.",
      href: "/new-owners",
      accent: "#1F8B4C",
      crumb: { parent: "New Owners", child: "Outreach" },
      stat: `${stats.totalOwners} owner${stats.totalOwners !== 1 ? "s" : ""} tracked`,
      alert: stats.uncontacted > 0 ? `${stats.uncontacted} not yet contacted` : null,
    },
    {
      number: 2,
      icon: Users,
      title: "Send your branded tenant pack",
      description: "Win over owners with a professional tenant package. Build trust and close fast.",
      href: "/new-owners?tab=pipeline",
      accent: "var(--kk-blue)",
      crumb: { parent: "New Owners", child: "Active Deals" },
      stat: `${stats.pipeline} deal${stats.pipeline !== 1 ? "s" : ""} in pipeline`,
      alert: stats.listedWithoutTenant > 0 ? `${stats.listedWithoutTenant} listed, awaiting tenant` : null,
    },
    {
      number: 3,
      icon: RefreshCw,
      title: "Renew contracts and earn passive income",
      description: "Get alerted 60 days before every expiry. Every renewal = half a month's rent, captured automatically.",
      href: "/existing-contracts",
      accent: "#C2410C",
      crumb: { parent: "Existing Contracts", child: undefined },
      stat: `${stats.activeContracts} active contract${stats.activeContracts !== 1 ? "s" : ""}`,
      alert: stats.expiringIn60 > 0 ? `${stats.expiringIn60} expiring within 60 days` : null,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-16">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--kk-ink-faint)" }}>
          Getting started
        </p>
        <h1 className="serif text-[26px] md:text-[38px] lg:text-[46px] leading-tight tracking-tight mb-4" style={{ color: "var(--kk-ink)" }}>
          {firstName ? `Welcome, ${firstName}.` : "Welcome to kakisewa."}
        </h1>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
          Three steps. Each one turns your database into recurring income.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step) => (
          <Link
            key={step.number}
            href={step.href}
            className="kk-card kk-card-hover flex overflow-hidden"
            style={{ textDecoration: "none", minHeight: 120 }}
          >
            {/* Left step block — uses theme panel color */}
            <div
              className="flex flex-col items-center justify-center shrink-0 px-5 gap-1"
              style={{ background: "var(--kk-step-panel-bg)", width: 80, borderRight: `1px solid rgba(0,0,0,0.06)` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-step-panel-ink)", opacity: 0.7 }}>
                Step
              </span>
              <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "var(--kk-step-panel-ink)" }}>
                {step.number}
              </span>
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0 p-5 relative">
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

              <h2 className="text-[16px] font-semibold leading-snug mb-1 pr-16 lg:pr-24 mt-1" style={{ color: "var(--kk-ink)", letterSpacing: "-0.012em" }}>
                {step.title}
              </h2>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--kk-ink-mute)" }}>
                {step.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink-faint)" }}>
                  {step.stat}
                </span>
                {step.alert && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: ALERT_COLOR }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {step.alert}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
