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
      fill="none"
      className={className}
    >
      {/* Vertical stem */}
      <path
        d="M6 3 L6 21"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="butt"
      />
      {/*
        S-curve arms: single continuous bezier from upper-right tip (17,5)
        through stem midpoint (6,12) to lower-right tip (17,21).
        Upper half bows RIGHT (top arc of s), lower half bows LEFT (bottom arc of s).
        G1-smooth at (6,12): both halves share tangent direction (5,6).
      */}
      <path
        d="M17 5 C 20,4 1,6 6,12 C 11,18 5,20 17,21"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
