"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, FileText, BookOpen, BarChart2, Lock } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/home",               icon: Home,      label: "Home",        matchPaths: ["/home"],                                                       minPlan: null },
  { href: "/new-owners",         icon: Users,     label: "Leads",       matchPaths: ["/new-owners", "/leads"],                                       minPlan: null },
  { href: "/existing-contracts", icon: FileText,  label: "Contracts",   matchPaths: ["/existing-contracts", "/tenancies"],                           minPlan: null },
  { href: "/directory",          icon: BookOpen,  label: "Directory",   matchPaths: ["/directory", "/network", "/database", "/supports", "/tenants"], minPlan: "platinum" },
  { href: "/performance",        icon: BarChart2, label: "Performance", matchPaths: ["/performance"],                                                minPlan: "elite" },
] as const;

const PLAN_RANK: Record<string, number> = { silver: 1, gold: 2, platinum: 3, elite: 4 };

function hasAccess(minPlan: string | null, plan: string | null | undefined, status: string | null | undefined, isAdmin: boolean) {
  if (isAdmin || !minPlan) return true;
  if (status === "beta" || status === "trial") return true;
  return (PLAN_RANK[plan ?? ""] ?? 0) >= PLAN_RANK[minPlan];
}

interface Props {
  plan: string | null;
  status: string | null;
  isAdmin: boolean;
}

export function SidebarNav({ plan, status, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className="kk-sidebar-nav flex-col shrink-0"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 200 : 64,
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        borderRight: "1px solid var(--kk-line)",
        background: "var(--kk-surface)",
        overflow: "hidden",
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <Link
        href="/home"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          marginBottom: 8,
          textDecoration: "none",
          color: "var(--kk-ink)",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <Logo size={28} />
        {expanded && (
          <span
            className="serif"
            style={{ fontSize: 18, letterSpacing: "-0.02em", opacity: 0, animation: "fadeIn 0.15s 0.1s ease forwards" }}
          >
            kakisewa
          </span>
        )}
      </Link>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          const accessible = hasAccess(item.minPlan, plan, status, isAdmin);

          return (
            <button
              key={item.href}
              onClick={() => router.push(accessible ? item.href : "/subscription")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: active ? "var(--kk-surface-2)" : "transparent",
                color: active ? "var(--kk-accent)" : accessible ? "var(--kk-ink-mute)" : "var(--kk-ink-faint)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              <item.icon
                style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: active ? 2.2 : 1.8 }}
              />
              {expanded && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    flex: 1,
                    opacity: 0,
                    animation: "fadeIn 0.12s 0.08s ease forwards",
                  }}
                >
                  {item.label}
                </span>
              )}
              {expanded && !accessible && (
                <Lock style={{ width: 11, height: 11, flexShrink: 0, opacity: 0.5 }} />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
