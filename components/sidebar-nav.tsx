"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, ClipboardList, RefreshCw, BookOpen, BarChart2, Lock, PanelLeft, Target, CalendarDays } from "lucide-react";

const STORAGE_KEY = "kk_sidebar_pinned";
const W_OPEN = 220;
const W_CLOSED = 64;

const TOP_ITEMS = [
  { href: "/home", icon: Home, label: "Home", matchPaths: ["/home"], minPlan: null },
] as const;

const PIPELINE_ITEMS = [
  { href: "/property-leads", icon: MessageCircle, label: "Property Leads", minPlan: null },
  { href: "/my-listing",  icon: ClipboardList,  label: "My Listing",  minPlan: null },
  { href: "/existing-listing",  icon: RefreshCw,      label: "Existing Listing",  minPlan: null },
  { href: "/lost-listing",      icon: Target,         label: "Lost Listing",     minPlan: null },
] as const;

const BOTTOM_ITEMS = [
  { href: "/calendar",    icon: CalendarDays, label: "My Calendar", matchPaths: ["/calendar"], minPlan: null },
  { href: "/directory",   icon: BookOpen,    label: "Directory",   matchPaths: ["/directory", "/network", "/database", "/supports", "/tenants"], minPlan: null },
  { href: "/performance", icon: BarChart2,   label: "Performance", matchPaths: ["/performance"], minPlan: "elite" },
] as const;

const PLAN_RANK: Record<string, number> = { silver: 1, gold: 2, platinum: 3, elite: 4 };

function hasAccess(minPlan: string | null, plan: string | null | undefined, status: string | null | undefined, isAdmin: boolean): boolean {
  if (isAdmin || !minPlan) return true;
  if (status === "beta" || status === "trial") return true;
  return (PLAN_RANK[plan ?? ""] ?? 0) >= PLAN_RANK[minPlan];
}

function isPipelineActive(href: string, pathname: string, _tab: string | null): boolean {
  if (href === "/property-leads") return pathname.startsWith("/property-leads") || pathname.startsWith("/potential-listing") || pathname.startsWith("/new-owners") || pathname.startsWith("/leads");
  if (href === "/my-listing")  return pathname.startsWith("/my-listing");
  if (href === "/existing-listing")  return pathname.startsWith("/existing-listing") || pathname.startsWith("/existing-contracts") || pathname.startsWith("/tenancies");
  if (href === "/lost-listing")      return pathname.startsWith("/lost-listing");
  return false;
}

interface Props { plan: string | null; status: string | null; isAdmin: boolean; }

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

  const showLabels = pinned || hovered || mobileOpen;
  const sidebarWidth = showLabels ? W_OPEN : W_CLOSED;
  const isOverlay = hovered && !pinned && !mobileOpen;

  function navButton(
    href: string,
    icon: React.ElementType,
    label: string,
    active: boolean,
    accessible: boolean,
    indent = false,
  ) {
    const Icon = icon;
    return (
      <button
        key={href}
        onClick={() => { router.push(accessible ? href : "/subscription"); setMobileOpen(false); }}
        onMouseEnter={() => router.prefetch(accessible ? href : "/subscription")}
        title={!showLabels ? label : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: showLabels
            ? `9px 12px 9px ${indent ? 18 : 12}px`
            : "9px 12px",
          justifyContent: showLabels ? "flex-start" : "center",
          borderRadius: 8,
          background: active ? "var(--kk-surface-2)" : "transparent",
          color: active ? "var(--kk-ink)" : accessible ? "var(--kk-ink-mute)" : "var(--kk-ink-faint)",
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
        <Icon style={{ width: 18, height: 18, flexShrink: 0, strokeWidth: active ? 2.2 : 1.7 }} />
        {showLabels && (
          <>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
            {!accessible && <Lock style={{ width: 10, height: 10, flexShrink: 0, opacity: 0.4 }} />}
          </>
        )}
      </button>
    );
  }

  const anyPipelineActive = PIPELINE_ITEMS.some(item => isPipelineActive(item.href, pathname, null));

  return (
    <>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.4)" }} />
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
        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", justifyContent: showLabels ? "flex-end" : "center", flexShrink: 0 }}>
          <button
            onClick={togglePinned}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            style={{
              width: 30, height: 30, border: "none",
              background: pinned ? "var(--kk-surface-2)" : "transparent",
              borderRadius: 6, cursor: "pointer",
              color: pinned ? "var(--kk-ink-mute)" : "var(--kk-ink-faint)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              opacity: showLabels ? 1 : 0,
              transition: "opacity 0.15s, background 0.15s",
              pointerEvents: showLabels ? "auto" : "none",
            }}
          >
            <PanelLeft style={{ width: 16, height: 16, transition: "transform 0.2s", transform: pinned ? "rotate(180deg)" : "none" }} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--kk-line)", margin: "0 10px", flexShrink: 0 }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>

          {/* Top items */}
          {TOP_ITEMS.map(item => {
            const active = item.matchPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
            return navButton(item.href, item.icon, item.label, active, true);
          })}

          {/* My pipeline group */}
          <div style={{ marginTop: 6 }}>
            {/* Group header — only visible when expanded */}
            {showLabels && (
              <div style={{
                padding: "6px 12px 2px 12px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--kk-ink-faint)",
                whiteSpace: "nowrap",
              }}>
                My pipeline
              </div>
            )}

            {/* Collapsed: thin accent line on left to visually group */}
            {!showLabels && anyPipelineActive && (
              <div style={{ height: 1, background: "var(--kk-line)", margin: "2px 10px" }} />
            )}

            {PIPELINE_ITEMS.map(item => {
              const active = isPipelineActive(item.href, pathname, null);
              const accessible = hasAccess(item.minPlan, plan, status, isAdmin);
              return navButton(item.href, item.icon, item.label, active, accessible, true);
            })}
          </div>

          {/* My desk group */}
          <div style={{ marginTop: 6 }}>
            {showLabels && (
              <div style={{
                padding: "6px 12px 2px 12px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--kk-ink-faint)",
                whiteSpace: "nowrap",
              }}>
                My desk
              </div>
            )}
            {BOTTOM_ITEMS.map(item => {
              const active = item.matchPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
              const accessible = hasAccess(item.minPlan, plan, status, isAdmin);
              return navButton(item.href, item.icon, item.label, active, accessible, true);
            })}
          </div>

        </nav>
      </aside>
    </>
  );
}
