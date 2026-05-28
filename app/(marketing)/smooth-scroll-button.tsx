"use client";

export function SmoothScrollButton({
  targetId, children, className, style,
}: {
  targetId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
