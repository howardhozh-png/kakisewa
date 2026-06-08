"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, FileText, BookOpen, BarChart2, Lock, PanelLeft } from "lucide-react";

const STORAGE_KEY = "kk_sidebar_pinned";
const W_OPEN = 220;
const W_CLOSED = 64;

const NAV_ITEMS = [
  { href: "/home",               icon: Home,      label: "Home",        matchPaths: ["/home"],                                                        minPlan: null },
  { href: "/new-owners",         icon: Users,     label: "Leads",       matchPaths: ["/new-owners", "/leads"],                                        minPlan: null },
  { href: "/existing-contracts", icon: FileText,  label: "Contracts",   matchPaths: ["/existing-contracts", "/tenancies"],                            minPlan: null },
  { href: "/directory",          icon: BookOpen,  label: "Directory",   matchPaths: ["/directory", "/network", "/database", "/supports", "/tenants"],  minPlan: "platinum" },
  { href: "/performance",        icon: BarChart2, label: "Performance", matchPaths: ["/performance"],                                                 minPlan: "elite" },
] as const;

const PLAN_RANK: Record<string, number> = { silver: 1, gold: 2, platinum: 3, elite: 4 };

function hasAccess(
  minPlan: string | null,
  plan: string | null | undefined,
  status: string | null | undefined,
  isAdmin: boolean,
): boolean {
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
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "1";
    setPinned(stored);
    document.documentElement.style.setProperty("--kk-sidebar-w", stored ? `${W_OPEN}px` : `${W_CLOSED}px`);
  }, []);

  useEffect(() => {
    function onToggle() { setMobileOpen(o => !o); }
    document.addEventListener("kk-sidebar-toggle", onToggle);
    return () => document.removeEventListener("kk-sidebar-toggle", onToggle);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function togglePinned() {
    setPinned(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      document.documentElement.style.setProperty("--kk-sidebar-w", next ? `${W_OPEN}px` : `${W_CLOSED}px`);
      return next;
    });
  }

  // Hover expands as overlay (no layout shift); pin shifts layout via --kk-sidebar-w
  const showLabels = pinned || hovered || mobileOpen;
  const sidebarWidth = showLabels ? W_OPEN : W_CLOSED;
  const isOverlay = hovered && !pinned && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.4)" }}
        />
      )}

      <aside
        className="kk-sidebar-nav"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarWidth,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          paddingTop: 64,
          zIndex: 40,
          background: "var(--kk-surface)",
          borderRight: "1px solid var(--kk-line)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transform: mobileOpen ? "translateX(0)" : undefined,
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s",
          boxShadow: isOverlay ? "4px 0 20px rgba(0,0,0,0.10)" : mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : undefined,
        }}
      >
        {/* Pin button */}
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            justifyContent: showLabels ? "flex-end" : "center",
            flexShrink: 0,
          }}
        >
          <button
            onClick={togglePinned}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            style={{
              width: 30,
              height: 30,
              border: "none",
              background: pinned ? "var(--kk-surface-2)" : "transparent",
              borderRadius: 6,
              cursor: "pointer",
              color: pinned ? "var(--kk-ink-mute)" : "var(--kk-ink-faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: showLabels ? 1 : 0,
              transition: "opacity 0.15s, background 0.15s",
              pointerEvents: showLabels ? "auto" : "none",
            }}
          >
            <PanelLeft
              style={{
                width: 16,
                height: 16,
                transition: "transform 0.2s",
                transform: pinned ? "rotate(180deg)" : "none",
              }}
            />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--kk-line)", margin: "0 10px", flexShrink: 0 }} />

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: "6px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            overflowY: "auto",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = item.matchPaths.some(
              (p) => pathname === p || pathname.startsWith(`${p}/`),
            );
            const accessible = hasAccess(item.minPlan, plan, status, isAdmin);

            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(accessible ? item.href : "/subscription");
                  setMobileOpen(false);
                }}
                title={!showLabels ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  justifyContent: showLabels ? "flex-start" : "center",
                  borderRadius: 8,
                  background: active ? "var(--kk-surface-2)" : "transparent",
                  color: active
                    ? "var(--kk-ink)"
                    : accessible
                      ? "var(--kk-ink-mute)"
                      : "var(--kk-ink-faint)",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textAlign: "left",
                  flexShrink: 0,
                  transition: "background 0.1s",
                }}
              >
                <item.icon
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    strokeWidth: active ? 2.2 : 1.7,
                  }}
                />
                {showLabels && (
                  <>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                    {!accessible && (
                      <Lock style={{ width: 10, height: 10, flexShrink: 0, opacity: 0.4 }} />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
