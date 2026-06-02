"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  tab: "outreach" | "pipeline";
  outreachCount: number;
  pipelineCount: number;
  helpSlot?: ReactNode;
}

export function LeadsSubNav({ tab, outreachCount, pipelineCount, helpSlot }: Props) {
  return (
    <div className="mb-8 flex items-center justify-between border-b" style={{ borderColor: "var(--kk-line)" }}>
      <div className="flex items-center gap-1 overflow-x-auto">
        <Tab href="/new-owners?tab=outreach" label="Outreach"     count={outreachCount} active={tab === "outreach"} />
        <Tab href="/new-owners?tab=pipeline" label="Active Deals" count={pipelineCount}  active={tab === "pipeline"} />
      </div>
      {helpSlot && <div className="pb-1 shrink-0 pl-4">{helpSlot}</div>}
    </div>
  );
}

function Tab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors",
        active ? "" : "hover:text-[var(--kk-ink)]"
      )}
      style={{ color: active ? "var(--kk-ink)" : "var(--kk-ink-mute)" }}
    >
      {label}
      <span
        className="text-[11px] tabular-nums px-1.5 rounded-full"
        style={{
          background: active ? "var(--kk-ink)" : "rgba(0,0,0,0.08)",
          color: active ? "#fff" : "var(--kk-ink-mute)",
        }}
      >
        {count}
      </span>
      {active && (
        <span
          className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full"
          style={{ background: "var(--kk-ink)" }}
        />
      )}
    </Link>
  );
}
