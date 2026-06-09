"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface Guide {
  what: string;
  why: string;
  action?: { label: string; href: string; urgent?: boolean };
}

function getGuide(pathname: string, uncontacted: number, expiringIn60: number): Guide | null {
  if (pathname.startsWith("/message-owners") || pathname.startsWith("/track-listing") || pathname.startsWith("/new-owners") || pathname.startsWith("/leads")) {
    return {
      what: "Follow up with every owner on your list.",
      why: "First contact wins the listing. Owners remember who reached out first.",
      action: uncontacted > 0
        ? { label: `${uncontacted} not yet contacted`, href: "/message-owners", urgent: false }
        : undefined,
    };
  }
  if (pathname.startsWith("/track-renewal") || pathname.startsWith("/existing-contracts") || pathname.startsWith("/tenancies")) {
    return {
      what: "Catch every renewal before it slips.",
      why: "Every renewal you close = half a month's rent. Miss it and another agent earns it.",
      action: expiringIn60 > 0
        ? { label: `${expiringIn60} expiring within 60 days`, href: "/track-renewal", urgent: true }
        : undefined,
    };
  }
  if (pathname.startsWith("/directory") || pathname.startsWith("/supports") || pathname.startsWith("/tenants")) {
    return {
      what: "Your contacts, all in one place.",
      why: "Your relationships are your business. Keep every owner, tenant, and vendor here.",
    };
  }
  if (pathname.startsWith("/performance")) {
    return {
      what: "Your income, tracked.",
      why: "Know what you've earned from renewals and what's still coming in.",
    };
  }
  return null;
}

interface Props {
  uncontacted: number;
  expiringIn60: number;
}

export function GuideStrip({ uncontacted, expiringIn60 }: Props) {
  const pathname = usePathname();
  const guide = getGuide(pathname, uncontacted, expiringIn60);
  if (!guide) return null;

  return (
    <div
      style={{
        background: "var(--kk-surface-2)",
        borderBottom: "1px solid var(--kk-line)",
        padding: "10px 20px",
      }}
    >
      <div
        className="mx-auto max-w-[1440px]"
        style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)" }}>
            {guide.what}
          </span>
          <span style={{ fontSize: 13, color: "var(--kk-ink-mute)", marginLeft: 6 }}>
            {guide.why}
          </span>
        </div>
        {guide.action && (
          <Link
            href={guide.action.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: guide.action.urgent ? "#DC2626" : "var(--kk-accent)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {guide.action.label}
            <ArrowRight style={{ width: 13, height: 13 }} />
          </Link>
        )}
      </div>
    </div>
  );
}
