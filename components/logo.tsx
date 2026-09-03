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
        <span
          className="serif tracking-tight leading-none"
          style={{ fontSize: size * 0.86, color: "currentColor" }}
        >
          kakisewa
        </span>
      </span>
    );
  }
  return <LogoMark size={size} className={className} />;
}

function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("serif leading-none select-none", className)}
      style={{ fontSize: size * 1.1, lineHeight: 1, display: "inline-block" }}
      aria-label="kakisewa"
    >
      k
    </span>
  );
}
