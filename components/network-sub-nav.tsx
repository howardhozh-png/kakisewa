"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  propertiesCount: number;
  tenantsCount: number;
  contactsCount: number;
  view: string;
}

export function NetworkSubNav({ propertiesCount, tenantsCount, contactsCount, view }: Props) {
  const tabs = [
    { href: "/directory",                label: "All properties",    shortLabel: "Properties",  count: propertiesCount, key: "properties" },
    { href: "/directory?view=tenants",   label: "All tenants",       shortLabel: "Tenants",     count: tenantsCount,    key: "tenants"    },
    { href: "/directory?view=contacts",  label: "Support contacts",  shortLabel: "Contacts",    count: contactsCount,   key: "contacts"   },
  ];

  return (
    <div className="mb-8 flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: "var(--kk-line)" }}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          className={cn("relative flex items-center gap-1.5 px-3 lg:px-4 py-3 text-[12px] lg:text-[14px] font-medium transition-colors whitespace-nowrap shrink-0", view === t.key ? "" : "hover:text-[var(--kk-ink)]")}
          style={{ color: view === t.key ? "var(--kk-ink)" : "var(--kk-ink-mute)" }}
        >
          <span className="hidden lg:inline">{t.label}</span>
          <span className="lg:hidden">{t.shortLabel}</span>
          <span
            className="text-[11px] tabular-nums px-1.5 rounded-full"
            style={{ background: view === t.key ? "var(--kk-ink)" : "rgba(0,0,0,0.08)", color: view === t.key ? "#fff" : "var(--kk-ink-mute)" }}
          >
            {t.count}
          </span>
          {view === t.key && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--kk-ink)" }} />
          )}
        </Link>
      ))}
    </div>
  );
}
