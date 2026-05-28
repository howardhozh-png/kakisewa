import { cn } from "@/lib/utils";

type Variant = "mark" | "wordmark";

interface LogoProps {
  variant?: Variant;
  size?: number;
  className?: string;
}

export function Logo({ variant = "mark", size = 28, className }: LogoProps) {
  if (variant === "wordmark") {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <LogoMark size={size} />
        <span className="flex flex-col leading-none gap-0.5">
          <span
            className="serif tracking-tight leading-none"
            style={{ fontSize: size * 0.86, color: "currentColor" }}
          >
            kakisewa
          </span>
          <span
            className="flex justify-between leading-none font-semibold"
            style={{ fontSize: size * 0.28, color: "currentColor", opacity: 0.45, fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}
          >
            {"カキセワ".split("").map((c, i) => <span key={i}>{c}</span>)}
          </span>
        </span>
      </span>
    );
  }
  return <LogoMark size={size} className={className} />;
}

function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="kakisewa"
      className={className}
    >
      <g fill="currentColor">
        {/* Stem */}
        <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
        {/* Upper arm — diagonal key shaft */}
        <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
        {/* Lower arm — diagonal key blade */}
        <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
      </g>
    </svg>
  );
}
