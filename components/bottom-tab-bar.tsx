"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, BookOpen, BarChart2 } from "lucide-react";

const TABS = [
  { href: "/home",               icon: Home,      label: "Home",        matchPaths: ["/home"] },
  { href: "/new-owners",         icon: Users,     label: "Leads",       matchPaths: ["/new-owners", "/leads"] },
  { href: "/existing-contracts", icon: FileText,  label: "Contracts",   matchPaths: ["/existing-contracts", "/tenancies"] },
  { href: "/directory",          icon: BookOpen,  label: "Directory",   matchPaths: ["/directory", "/supports", "/tenants"] },
  { href: "/performance",        icon: BarChart2, label: "Performance", matchPaths: ["/performance"] },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div
      className="kk-bottom-tab"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "var(--kk-surface)",
        borderTop: "1px solid var(--kk-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ display: "flex" }}>
      {TABS.map((tab) => {
        const active = tab.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 8,
              paddingBottom: 8,
              gap: 3,
              textDecoration: "none",
              color: active ? "var(--kk-accent)" : "var(--kk-ink-faint)",
              transition: "color 0.12s ease",
            }}
          >
            <tab.icon style={{ width: 22, height: 22, strokeWidth: active ? 2.2 : 1.8 }} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: "0.01em" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
