"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, FileText, BookOpen, BarChart2, Lock, Menu } from "lucide-react";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onToggle() { setMobileOpen(o => !o); }
    document.addEventListener("kk-sidebar-toggle", onToggle);
    return () => document.removeEventListener("kk-sidebar-toggle", onToggle);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isExpanded = expanded || mobileOpen;

  return (
    <>
      {/* Backdrop — mobile only */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.4)" }}
        />
      )}

      {/*
        Aside starts at top:64 (below the sticky top nav) so its entire surface
        is visible and hoverable — no z-index conflict with the top nav.
      */}
      <aside
        className="kk-sidebar-nav flex-col"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: isExpanded ? 200 : 64,
          height: "calc(100vh - 64px)",
          position: "fixed",
          top: 64,
          left: 0,
          transform: mobileOpen ? "translateX(0)" : undefined,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          borderRight: "1px solid var(--kk-line)",
          background: "var(--kk-surface)",
          overflow: "hidden",
          zIndex: 40,
          boxShadow: mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
        }}
      >
        {/* Menu icon header — visual indicator, also acts as hover target */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 12px",
            height: 40,
            flexShrink: 0,
            color: "var(--kk-ink-faint)",
          }}
        >
          <Menu style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 1.8 }} />
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
            const accessible = hasAccess(item.minPlan, plan, status, isAdmin);

            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(accessible ? item.href : "/subscription");
                  setMobileOpen(false);
                }}
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
                <item.icon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: active ? 2.2 : 1.8 }} />
                {isExpanded && (
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
                {isExpanded && !accessible && (
                  <Lock style={{ width: 11, height: 11, flexShrink: 0, opacity: 0.5 }} />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
