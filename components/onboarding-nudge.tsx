"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, Check, ListChecks, Lock, ArrowRight } from "lucide-react";

const BANNER_DISMISS_KEY = "kk_onboarding_banner_";

interface Props {
  isNewAgent: boolean;
  hasLeads: boolean;
  hasContracts: boolean;
  hasCalendarEvent: boolean;
  hasTenants: boolean;
  hasSupports: boolean;
}

interface Mission {
  id: string;
  label: string;
  description: string;
  cta: string;
  href: string;
  matchPaths: string[];
  done: boolean;
}

export function OnboardingNudge({ isNewAgent, hasLeads, hasContracts, hasCalendarEvent, hasTenants, hasSupports }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const missions: Mission[] = [
    {
      id: "leads",
      label: "Upload your first potential listing",
      description: "Add the owners you want to approach for rental management.",
      cta: "Upload now",
      href: "/potential-listing",
      matchPaths: ["/potential-listing", "/new-owners", "/leads"],
      done: hasLeads,
    },
    {
      id: "contracts",
      label: "Add an existing tenancy contract",
      description: "Track the properties you already manage so renewals never slip.",
      cta: "Add contract",
      href: "/existing-listing",
      matchPaths: ["/existing-listing", "/existing-contracts", "/tenancies"],
      done: hasContracts,
    },
    {
      id: "calendar",
      label: "Add a calendar appointment",
      description: "Schedule a viewing, meeting, or follow-up to stay on top of your pipeline.",
      cta: "Open calendar",
      href: "/calendar",
      matchPaths: ["/calendar"],
      done: hasCalendarEvent,
    },
    {
      id: "tenants",
      label: "Add your first tenant profile",
      description: "Keep tenant details in one place for smooth handovers and renewals.",
      cta: "Add tenant",
      href: "/tenants",
      matchPaths: ["/tenants", "/tenant-profile", "/directory"],
      done: hasTenants,
    },
    {
      id: "supports",
      label: "Save a support contact",
      description: "Add your go-to plumber, electrician, or handyman for quick access.",
      cta: "Go to network",
      href: "/network",
      matchPaths: ["/network", "/database", "/supports"],
      done: hasSupports,
    },
  ];

  const total = missions.length;
  const allDone = missions.every((m) => m.done);
  const doneCount = missions.filter((m) => m.done).length;
  const activeStep = missions.findIndex((m) => !m.done);

  // Hard-block: no X button, modal always reopens on fresh load until all done
  const hardBlock = !allDone;

  // Banner shows when user is already on the page for the active step
  const currentPageMission = activeStep >= 0 ? missions[activeStep] : null;
  const onActivePage =
    !allDone &&
    currentPageMission !== null &&
    currentPageMission.matchPaths.some((p) => pathname.startsWith(p));

  // Auto-open modal on fresh load whenever steps are incomplete
  useEffect(() => {
    if (!isNewAgent) return;
    if (allDone) return;
    setModalOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset banner dismiss when active step changes
  useEffect(() => {
    setBannerDismissed(false);
  }, [activeStep]);

  if (!isNewAgent) return null;

  function go(href: string) {
    setModalOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Sticky per-page banner — appears when user is already on the active step's page */}
      {!modalOpen && onActivePage && !bannerDismissed && currentPageMission && (
        <div
          style={{
            background: "var(--kk-blue)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.25)",
              borderRadius: 99,
              padding: "2px 9px",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Step {activeStep + 1} of {total}
          </span>
          <span style={{ flex: 1 }}>{currentPageMission.label}</span>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: "#fff",
              color: "var(--kk-blue)",
              borderRadius: 99,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
            }}
          >
            {currentPageMission.cta}
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 4, lineHeight: 0 }}
            aria-label="Dismiss banner"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Floating checklist button */}
      {!modalOpen && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: allDone ? "var(--kk-green)" : "var(--kk-ink)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          }}
          aria-label="Open setup checklist"
        >
          <ListChecks style={{ width: 14, height: 14 }} />
          Setup {doneCount}/{total}
        </button>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (hardBlock) return;
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--kk-surface)", boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}
          >
            {/* X button only after all done */}
            {!hardBlock && (
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full transition-opacity hover:opacity-60"
                style={{ color: "var(--kk-ink-mute)" }}
                aria-label="Dismiss"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            )}

            {/* Header */}
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-accent)" }}>
              Getting started
            </p>
            <h2 className="font-bold text-[18px] leading-tight mb-1" style={{ color: "var(--kk-ink)" }}>
              {allDone ? "You're all set up!" : "Your setup guide"}
            </h2>
            <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
              {allDone
                ? "All 5 steps done. kakisewa is working for you."
                : `Step ${doneCount + 1} of ${total} — complete each step to get the most out of kakisewa.`}
            </p>

            {/* Progress bar */}
            <div className="mb-5 rounded-full overflow-hidden" style={{ height: 4, background: "var(--kk-line)" }}>
              <div
                style={{
                  width: `${(doneCount / total) * 100}%`,
                  height: "100%",
                  background: "var(--kk-green)",
                  borderRadius: 99,
                  transition: "width 400ms ease",
                }}
              />
            </div>

            {/* Step list */}
            <div className="flex flex-col gap-2">
              {missions.map((m, i) => {
                const isDone = m.done;
                const isActive = i === activeStep;
                const isLocked = !isDone && i > activeStep;

                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-xl px-3 py-3"
                    style={{
                      background: isDone
                        ? "rgba(52,199,89,0.07)"
                        : isActive
                        ? "var(--kk-surface-2)"
                        : "transparent",
                      border: `1px solid ${
                        isDone
                          ? "rgba(52,199,89,0.2)"
                          : isActive
                          ? "var(--kk-line)"
                          : "transparent"
                      }`,
                      opacity: isLocked ? 0.4 : 1,
                    }}
                  >
                    {/* Circle indicator */}
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold mt-0.5"
                      style={{
                        background: isDone
                          ? "var(--kk-green)"
                          : isActive
                          ? "var(--kk-ink)"
                          : "var(--kk-line)",
                        color: isDone || isActive ? "#fff" : "var(--kk-ink-mute)",
                      }}
                    >
                      {isDone ? (
                        <Check style={{ width: 14, height: 14 }} />
                      ) : isLocked ? (
                        <Lock style={{ width: 12, height: 12 }} />
                      ) : (
                        i + 1
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className="block text-[13px] font-semibold leading-tight mb-0.5"
                        style={{
                          color: isDone ? "var(--kk-ink-mute)" : "var(--kk-ink)",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {m.label}
                      </span>
                      {isActive && (
                        <span className="block text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                          {m.description}
                        </span>
                      )}
                    </div>

                    {isActive && (
                      <button
                        onClick={() => go(m.href)}
                        className="shrink-0 flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 mt-0.5"
                        style={{ background: "var(--kk-ink)", color: "#fff", whiteSpace: "nowrap", border: "none", cursor: "pointer" }}
                      >
                        {m.cta}
                        <ArrowRight style={{ width: 11, height: 11 }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {!allDone && (
              <p className="text-center text-[11px] mt-4" style={{ color: "var(--kk-ink-faint)" }}>
                Complete each step then tap the checklist button to return
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
