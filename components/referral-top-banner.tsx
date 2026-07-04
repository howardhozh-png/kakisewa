"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  referralSlug: string;
}

export function ReferralTopBanner({ referralSlug }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const fullLink = `https://kakisewa.com/sign-up?ref=${referralSlug}`;
  const shortLink = `kakisewa.com/sign-up?ref=${referralSlug}`;

  function copyLink() {
    navigator.clipboard.writeText(fullLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        background: "var(--kk-blue-soft, #EBF5FF)",
        borderBottom: "1px solid rgba(0,113,227,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "4px 8px",
        padding: "8px 40px",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--kk-ink, #1D1D1F)",
        position: "relative",
        minHeight: 36,
      }}
    >
      <span>Refer agents to pay for your bill.</span>
      <span style={{ opacity: 0.35 }}>Your link:</span>
      <button
        onClick={copyLink}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--kk-blue, #0071E3)", fontWeight: 600,
          fontSize: 13, padding: 0,
          textDecoration: copied ? "none" : "underline",
          textUnderlineOffset: 2,
        }}
      >
        {copied ? "Copied!" : shortLink}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute", right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--kk-ink-mute, #6E6E73)", opacity: 0.45,
          lineHeight: 0, padding: 6,
        }}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
