"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      style={{ color: "var(--kk-ink)" }}
    >
      <p
        className="font-semibold tracking-widest uppercase mb-4"
        style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
      >
        Something went wrong
      </p>
      <h1
        className="serif mb-3"
        style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
      >
        An unexpected error occurred
      </h1>
      <p style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink-mute)", marginBottom: 32, maxWidth: 400 }}>
        Try refreshing the page. If it keeps happening, contact us at{" "}
        <a href="mailto:support@kakisewa.com" className="underline">support@kakisewa.com</a>.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-full font-semibold transition-opacity hover:opacity-80"
        style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
      >
        Try again
      </button>
    </div>
  );
}
