import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

interface Props {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  compact?: boolean;
}

export function FeatureLockedState({ title, body, ctaLabel, ctaHref = "/subscription", compact }: Props) {
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--kk-surface-2)" }}>
          <Lock className="w-4 h-4" style={{ color: "var(--kk-ink-mute)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--kk-ink)" }}>{title}</p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>{body}</p>
        </div>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-[12px] shrink-0 transition-opacity hover:opacity-90"
          style={{ background: "var(--kk-ink)", color: "#fff" }}
        >
          {ctaLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4 py-20 px-6 max-w-sm mx-auto">
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--kk-surface-2)" }}>
        <Lock className="w-5 h-5" style={{ color: "var(--kk-ink-mute)" }} />
      </div>
      <h2 className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--kk-ink)" }}>{title}</h2>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)", maxWidth: "30ch" }}>{body}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90"
        style={{ background: "var(--kk-ink)", color: "#fff" }}
      >
        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
