"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  makeCount?: number;
  renewCount?: number;
  helpSlot?: ReactNode;
}

export function MoneySubNav({ renewCount, helpSlot }: Props) {
  const isRenew = usePathname().startsWith("/existing-contracts");

  return (
    <div className="mb-8 flex items-center justify-between border-b" style={{ borderColor: "var(--kk-line)" }}>
      <div className="flex items-center gap-1">
        <Tab href="/existing-contracts" label="Existing contracts" count={renewCount} active={isRenew} />
      </div>
      {helpSlot && <div className="pb-1 shrink-0 pl-4">{helpSlot}</div>}
    </div>
  );
}

function Tab({ href, label, count, active }: { href: string; label: string; count?: number; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn("relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors", active ? "" : "hover:text-[var(--kk-ink)]")}
      style={{ color: active ? "var(--kk-ink)" : "var(--kk-ink-mute)" }}
    >
      {label}
      {count != null && (
        <span
          className="text-[11px] tabular-nums px-1.5 rounded-full"
          style={{ background: active ? "var(--kk-ink)" : "rgba(0,0,0,0.08)", color: active ? "#fff" : "var(--kk-ink-mute)" }}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--kk-ink)" }} />
      )}
    </Link>
  );
}
