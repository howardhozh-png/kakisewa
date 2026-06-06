"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AgentPageError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <p className="font-semibold tracking-widest uppercase mb-4"
        style={{ fontSize: 11, color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
        Profile unavailable
      </p>
      <h1 className="serif mb-3"
        style={{ fontSize: "clamp(1.5rem,4vw,2.25rem)", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--kk-ink)" }}>
        This agent profile couldn't be loaded
      </h1>
      <p style={{ fontSize: 15, color: "var(--kk-ink-mute)", marginBottom: 32, maxWidth: 380 }}>
        The link may be invalid or the profile is no longer active.
      </p>
      <Link href="/"
        className="px-6 py-2.5 rounded-full font-semibold transition-opacity hover:opacity-80"
        style={{ background: "var(--kk-ink)", color: "#fff", fontSize: 15 }}>
        Go home
      </Link>
    </div>
  );
}
