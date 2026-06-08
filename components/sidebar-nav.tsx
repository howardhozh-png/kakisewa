"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, FileText, BookOpen, BarChart2, Lock, X } from "lucide-react";

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

  // Listen for mobile toggle event from top nav
  useEffect(() => {
    function onToggle() { setMobileOpen(o => !o); }
    document.addEventListener("kk-sidebar-toggle", onToggle);
    return () => document.removeEventListener("kk-sidebar-toggle", onToggle);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isExpanded = expanded || mobileOpen;

  return (
    <>
      {/* Backdrop — mobile only, closes sidebar on tap */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 39,
            background: "rgba(0,0,0,0.4)",
          }}
        />
      )}

      <aside
        className="kk-sidebar-nav flex-col"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: isExpanded ? 200 : 64,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          // mobileOpen overrides the CSS class transform (translateX(-200px) on mobile)
          transform: mobileOpen ? "translateX(0)" : undefined,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          borderRight: "1px solid var(--kk-line)",
          background: "var(--kk-surface)",
          overflow: "hidden",
          zIndex: 40,
          boxShadow: mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
        }}
      >
        {/* Nav items — paddingTop clears the fixed top nav (64px) */}
        <nav style={{ flex: 1, padding: "0 8px", paddingTop: 80, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Mobile close row — only shown when sidebar is open on mobile */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                marginBottom: 4,
                borderRadius: 12,
                background: "transparent",
                color: "var(--kk-ink-faint)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              aria-label="Close menu"
            >
              <X style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1, opacity: 0, animation: "fadeIn 0.12s 0.08s ease forwards" }}>
                Close
              </span>
            </button>
          )}
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
                <item.icon
                  style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: active ? 2.2 : 1.8 }}
                />
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
