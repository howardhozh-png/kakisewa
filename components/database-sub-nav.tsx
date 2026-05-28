"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  propertiesCount: number;
  tenantsCount: number;
}

export function DatabaseSubNav({ propertiesCount, tenantsCount }: Props) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const isProperties = view !== "tenants";
  const isTenants    = view === "tenants";

  return (
    <div className="mb-8 flex items-center gap-1 border-b" style={{ borderColor: "var(--kk-line)" }}>
      <Tab href="/database"              label="All properties" count={propertiesCount} active={isProperties} />
      <Tab href="/database?view=tenants" label="All tenants"    count={tenantsCount}   active={isTenants} />
    </div>
  );
}

function Tab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn("relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors", active ? "" : "hover:text-[var(--kk-ink)]")}
      style={{ color: active ? "var(--kk-ink)" : "var(--kk-ink-mute)" }}
    >
      {label}
      <span
        className="text-[11px] tabular-nums px-1.5 rounded-full"
        style={{ background: active ? "var(--kk-ink)" : "rgba(0,0,0,0.08)", color: active ? "#fff" : "var(--kk-ink-mute)" }}
      >
        {count}
      </span>
      {active && (
        <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--kk-ink)" }} />
      )}
    </Link>
  );
}
