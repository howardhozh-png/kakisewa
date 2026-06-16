"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#FAFAFA", color: "#1C1C1E" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#AEAEB2", marginBottom: 16 }}>
            Something went wrong
          </p>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 12 }}>
            An unexpected error occurred
          </h1>
          <p style={{ fontSize: 15, color: "#6C6C70", marginBottom: 32, maxWidth: 400 }}>
            Try refreshing the page. If the problem persists, contact us at{" "}
            <a href="mailto:support@kakisewa.com" style={{ textDecoration: "underline" }}>support@kakisewa.com</a>.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                borderRadius: 999,
                background: "#1C1C1E",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "10px 24px",
                borderRadius: 999,
                background: "transparent",
                color: "#1C1C1E",
                fontSize: 14,
                fontWeight: 600,
                border: "1.5px solid #1C1C1E",
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
