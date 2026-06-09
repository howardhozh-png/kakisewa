"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Upload, Send, RefreshCw } from "lucide-react";

const STORAGE_KEY = "kk_tour_v1";
export const TOUR_EVENT = "kk:open-tour";

const OVERLAY_Z = 99990;
const CARD_Z = 100001; // above mobile menu (100000) so it's always on top
const CARD_W = 340;
const CARD_MAX_H = 420; // conservative upper bound for card height
const NAV_H = 64;
const PAD = 10; // padding around the spotlight cutout
const CUTOUT_R = 12; // border-radius of the cutout
// iOS Safari shows a ~84px bottom toolbar that overlaps fixed-position content.
// We reserve extra space so the Next button is never hidden behind it.
const BOTTOM_SAFE = 110;

interface TourStep {
  targetId?: string;
  href?: string;
  label?: string;
  title: string;
  body?: string;
  bullets?: string[];
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to kakisewa",
    body: "30 seconds. We will show you the five sections and three key workflows so you can hit the ground running on day one.",
  },
  {
    targetId: "tour-nav-home",
    label: "Section 1 of 5",
    title: "Home",
    body: "Your command centre. Check your daily streak, fortune, and a live snapshot of your pipeline at a glance.",
  },
  {
    targetId: "tour-nav-new-owners",
    label: "Section 2 of 5",
    title: "New Owners",
    body: "Where you grow your portfolio. Track owner leads, send WhatsApp outreach, and import your entire Excel or CSV list in one click.",
  },
  {
    targetId: "tour-nav-contracts",
    label: "Section 3 of 5",
    title: "Existing Contracts",
    body: "Protect your renewal income. Every active tenancy lives here. See who is expiring and act before they slip away.",
  },
  {
    targetId: "tour-nav-directory",
    label: "Section 4 of 5",
    title: "Directory",
    body: "Your full network in one place. All properties, tenants, and support contacts like plumbers and cleaners.",
  },
  {
    targetId: "tour-nav-performance",
    label: "Section 5 of 5",
    title: "Performance",
    body: "Set a monthly commission target and watch your income build up as deals close.",
  },
  {
    targetId: "tour-btn-upload-csv",
    href: "/potential-listing",
    label: "Workflow 1 of 3",
    title: "Get new owners listed",
    Icon: Upload,
    bullets: [
      "Upload your Excel or CSV owner list with this button",
      "Send WhatsApp outreach to each owner from the table",
      "Once they reply, fill in their property details to move them to Listed",
    ],
  },
  {
    targetId: "kk-col-listed",
    href: "/my-listing",
    label: "Workflow 2 of 3",
    title: "Send the tenant pack",
    Icon: Send,
    bullets: [
      "Open any owner card in the Listed column",
      "Click Share tenant pack to send matched tenants to the owner",
      "Once they pick a tenant, mark the unit as Rented",
    ],
  },
  {
    targetId: "kk-col-headsup",
    href: "/existing-listing",
    label: "Workflow 3 of 3",
    title: "Renew and collect commission",
    Icon: RefreshCw,
    bullets: [
      "Cards here are expiring within 60 days and need your action",
      "Send check-in messages to both owner and tenant",
      "Once confirmed, collect your commission and set the new end date",
    ],
  },
  {
    title: "You are ready to go!",
    body: "Start with New Owners. Import your owner list or add your first property manually. Replay this tour anytime from your account menu.",
  },
];

export function SpotlightTour() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [linkRect, setLinkRect] = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => setVisible(true), 500);
    }
  }, []);

  useEffect(() => {
    function handleOpen() { setStepIndex(0); setVisible(true); }
    document.addEventListener(TOUR_EVENT, handleOpen);
    return () => document.removeEventListener(TOUR_EVENT, handleOpen);
  }, []);

  const findRect = useCallback(() => {
    const step = STEPS[stepIndex];
    if (!step.targetId) { setLinkRect(null); return; }
    // On mobile, nav items are hidden — try the -mobile ID first
    const isMobile = window.innerWidth < 1024;
    const ids = isMobile && step.targetId.startsWith("tour-nav-")
      ? [step.targetId + "-mobile", step.targetId]
      : [step.targetId];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0) { setLinkRect(r); return; }
    }
    setLinkRect(null);
  }, [stepIndex]);

  // Navigate if needed, then find the element rect
  useEffect(() => {
    if (!visible) return;
    const step = STEPS[stepIndex];
    const isMobile = window.innerWidth < 1024;
    const isNavStep = !!step.targetId?.startsWith("tour-nav-");

    // On mobile: open the hamburger menu so nav tabs are visible during nav steps
    if (isMobile) {
      if (isNavStep) {
        document.dispatchEvent(new CustomEvent("kk:tour-open-menu"));
      } else {
        document.dispatchEvent(new CustomEvent("kk:tour-close-menu"));
      }
    }

    if (step.href) {
      const cur = window.location.pathname + window.location.search;
      if (cur !== step.href) {
        setLinkRect(null);
        setNavigating(true);
        router.push(step.href);
        return;
      }
    }
    setNavigating(false);
    findRect();
  }, [stepIndex, visible, router, findRect]);

  // After navigation, retry until the target element appears in the DOM
  useEffect(() => {
    if (!navigating || !visible) return;
    const step = STEPS[stepIndex];
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tryFind = () => {
      attempts++;
      const el = step.targetId ? document.getElementById(step.targetId) : null;
      const ready = !step.targetId || (el && el.getBoundingClientRect().width > 0);
      if (ready || attempts >= 15) {
        setNavigating(false);
        findRect();
      } else {
        timer = setTimeout(tryFind, 150);
      }
    };
    timer = setTimeout(tryFind, 300);
    return () => clearTimeout(timer);
  }, [navigating, visible, findRect, stepIndex]);

  // Lock body scroll while tour is open.
  // iOS Safari ignores overflow:hidden on body; fixing position prevents scroll.
  useEffect(() => {
    if (!visible) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  function close() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "seen");
    document.dispatchEvent(new CustomEvent("kk:tour-close-menu"));
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      close();
      router.push("/home");
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function prev() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!mounted || !visible) return null;

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isNavStep = !!step.targetId?.startsWith("tour-nav-");

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  // Responsive card width — never overflow the viewport on small phones
  const cardW = Math.min(CARD_W, vw - 32);

  // Cutout geometry (what we punch out of the overlay)
  const cutout = linkRect && linkRect.width > 0 ? {
    x: linkRect.left - PAD,
    y: linkRect.top - PAD,
    w: linkRect.width + PAD * 2,
    h: linkRect.height + PAD * 2,
  } : null;

  // Card position
  let cardTop: number, cardLeft: number;
  let arrowDir: "up" | "down" | null = null;
  let arrowLeft: number | null = null;

  // Max top that still keeps the full card above the iOS bottom chrome
  const maxCardTop = Math.max(80, vh - CARD_MAX_H - BOTTOM_SAFE);

  if (cutout && linkRect) {
    const cx = linkRect.left + linkRect.width / 2;
    const visibleH = Math.min(linkRect.height, Math.max(0, vh - linkRect.top));
    const cutoutVisBottom = linkRect.top + visibleH + PAD;

    if (isNavStep) {
      // On mobile the nav items are inside the full-screen menu; place card at bottom so it doesn't cover the list.
      // On desktop the nav is a top bar; place card just below it.
      if (vw < 1024) {
        cardTop = vh - CARD_MAX_H - BOTTOM_SAFE;
      } else if (linkRect.top > vh * 0.5) {
        cardTop = Math.max(80, linkRect.top - CARD_MAX_H - 20);
      } else {
        cardTop = NAV_H + 20;
      }
    } else {
      const below = cutoutVisBottom + 12;
      const above = linkRect.top - PAD - 12 - CARD_MAX_H;
      cardTop = below + CARD_MAX_H < vh - BOTTOM_SAFE ? below : Math.max(80, above);
    }

    // Never let the card bottom fall behind iOS browser chrome
    cardTop = Math.min(cardTop, maxCardTop);
    cardTop = Math.max(80, cardTop);

    cardLeft = Math.max(16, Math.min(vw - cardW - 16, cx - cardW / 2));
    arrowDir = cardTop > cutoutVisBottom ? "up" : "down";
    arrowLeft = Math.max(20, Math.min(cardW - 28, cx - cardLeft));
  } else {
    cardTop = Math.max(80, Math.min(maxCardTop, Math.round(vh / 2 - 160)));
    cardLeft = Math.round((vw - cardW) / 2);
  }

  return (
    <>
      {/* SVG overlay: dark background with a transparent spotlight cutout */}
      <svg
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: OVERLAY_Z, pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="kk-tour-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect x={cutout.x} y={cutout.y} width={cutout.w} height={cutout.h} rx={CUTOUT_R} fill="black" />
            )}
          </mask>
        </defs>
        {/* Dark vignette with hole */}
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#kk-tour-spotlight)" />
        {/* Accent ring drawn on top of the cutout area */}
        {cutout && !navigating && (
          <rect
            x={cutout.x} y={cutout.y} width={cutout.w} height={cutout.h}
            rx={CUTOUT_R}
            fill="none"
            stroke="rgba(0,113,227,0.65)"
            strokeWidth="2.5"
          />
        )}
      </svg>

      {/* Tour card — hidden while navigating to prevent jump */}
      {!navigating && (
        <div style={{ position: "fixed", inset: 0, zIndex: CARD_Z, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: cardTop,
              left: cardLeft,
              width: cardW,
              background: "#fff",
              borderRadius: 22,
              boxShadow: "0 28px 72px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.12)",
              padding: "22px 24px 20px",
              pointerEvents: "auto",
            }}
          >
            {/* Arrow pointing at the spotlight */}
            {arrowDir && arrowLeft !== null && (
              <div style={{
                position: "absolute",
                ...(arrowDir === "up" ? { top: -9 } : { bottom: -9 }),
                left: arrowLeft - 9,
                width: 0, height: 0,
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                ...(arrowDir === "up" ? { borderBottom: "9px solid #fff" } : { borderTop: "9px solid #fff" }),
              }} />
            )}

            {/* Close */}
            <button
              onClick={close}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-60"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}
              aria-label="Close tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {step.Icon && (
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "var(--kk-accent)", color: "#fff" }}>
                <step.Icon className="w-4 h-4" />
              </div>
            )}

            {step.label && (
              <p className="kk-overline mb-1.5" style={{ color: "var(--kk-accent)" }}>{step.label}</p>
            )}

            <p className="serif text-[22px] leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.02em", paddingRight: 28 }}>
              {step.title}
            </p>

            {step.bullets ? (
              <ul className="list-disc pl-5 mt-3 space-y-2 text-[13px] leading-snug" style={{ color: "var(--kk-ink-mute)" }}>
                {step.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            ) : step.body ? (
              <p className="text-[13px] mt-2.5 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                {step.body}
              </p>
            ) : null}

            <div className="flex items-center justify-between mt-5">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === stepIndex ? 18 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i === stepIndex ? "var(--kk-accent)" : i < stepIndex ? "rgba(0,0,0,0.20)" : "rgba(0,0,0,0.09)",
                      transition: "width 160ms ease, background 160ms ease",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isFirst && (
                  <button
                    onClick={prev}
                    className="flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                    style={{ color: "var(--kk-ink-mute)", background: "var(--kk-surface-2)" }}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-85"
                  style={{ background: "var(--kk-accent)", color: "#fff" }}
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
