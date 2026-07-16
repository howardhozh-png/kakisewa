"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Handshake, FileCheck, RefreshCw } from "lucide-react";

const STAGES = [
  {
    icon: MessageCircle,
    title: "Message owner",
    desc: "Reach out the moment you find a lead. Branded templates, one tap to send.",
    descShort: "One tap to reach out.",
    when: "Day 1",
  },
  {
    icon: Handshake,
    title: "Close lead",
    desc: "Every reply tracked in one pipeline. Follow up before they go quiet.",
    descShort: "Every reply tracked.",
    when: "Week 1–2",
  },
  {
    icon: FileCheck,
    title: "Tenancy signed",
    desc: "Lead becomes a tenancy. Commission collected, property now managed.",
    descShort: "Commission collected.",
    when: "Month 1",
  },
  {
    icon: RefreshCw,
    title: "Renewal tracked automatically",
    desc: "60 and 30 day reminders before every expiry, for as long as they stay.",
    descShort: "Reminders before every expiry.",
    when: "Ongoing",
    accent: true,
  },
];

export function JourneyTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p
          className="uppercase font-semibold mb-4"
          style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
        >
          The journey
        </p>
        <h2
          className="serif mx-auto"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em", maxWidth: "26ch", color: "#1D1D1F" }}
        >
          From first message to protected income.
        </h2>
        <p style={{ fontSize: 13, color: "var(--kk-ink-faint)", marginTop: 10, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
          <span className="kk-journey-full">One pipeline, whether you're chasing your first lead or protecting a book of a hundred.</span>
          <span className="kk-journey-short">One pipeline, start to renewal.</span>
        </p>
      </div>

      {/* Icon row with connecting bars that fill in sequence on scroll */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, position: "relative" }}>
        {/* "You start here today" callout above the first icon */}
        <div style={{
          position: "absolute", top: -30, left: 0,
          opacity: revealed ? 1 : 0,
          transition: "opacity 420ms ease 0.1s",
          pointerEvents: "none",
        }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: "#1D1D1F",
            background: "#F5F5F7", borderRadius: 20, padding: "4px 10px",
            whiteSpace: "nowrap", display: "inline-block",
          }}>
            <span className="kk-journey-full">You start here today</span>
            <span className="kk-journey-short">Start here</span>
          </span>
        </div>

        {/* "kakisewa takes care of the rest" callout above the last icon */}
        <div style={{
          position: "absolute", top: -30, right: 0,
          opacity: revealed ? 1 : 0,
          transition: `opacity 420ms ease ${(STAGES.length - 1) * 0.6 + 0.2}s`,
          pointerEvents: "none",
        }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: "#1F8B4C",
            background: "#E4F7E9", borderRadius: 20, padding: "4px 10px",
            whiteSpace: "nowrap", display: "inline-block",
          }}>
            <span className="kk-journey-full">kakisewa takes care of the rest</span>
            <span className="kk-journey-short">We take it from here</span>
          </span>
        </div>

        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <div key={stage.title} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "0 0 auto" }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: stage.accent ? "#34C759" : "#1D1D1F",
                  opacity: revealed ? 1 : 0.4,
                  transform: revealed ? "scale(1)" : "scale(0.85)",
                  transition: `opacity 420ms ease ${i * 0.6}s, transform 420ms ease ${i * 0.6}s`,
                  position: "relative",
                }}
              >
                <Icon style={{ width: 19, height: 19, color: "#fff" }} />
                <span className="kk-journey-num" style={{
                  position: "absolute", bottom: -3, right: -3,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#fff", border: `1.5px solid ${stage.accent ? "#34C759" : "#1D1D1F"}`,
                  alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, color: stage.accent ? "#1F8B4C" : "#1D1D1F",
                }}>
                  {i + 1}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: "rgba(0,0,0,0.08)", margin: "0 4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: STAGES[i + 1].accent ? "#34C759" : "#1D1D1F",
                      width: revealed ? "100%" : "0%",
                      transition: `width 1100ms ease ${i * 0.6 + 0.3}s`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage cards */}
      <div
        className="kk-journey-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
      >
        {STAGES.map((stage, i) => (
          <div
            key={stage.title}
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(10px)",
              transition: `opacity 420ms ease ${i * 0.6 + 0.3}s, transform 420ms ease ${i * 0.6 + 0.3}s`,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: stage.accent ? "#1F8B4C" : "#1D1D1F", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span className="kk-journey-num" style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                background: "#fff", border: `1.5px solid ${stage.accent ? "#34C759" : "#1D1D1F"}`,
                alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: stage.accent ? "#1F8B4C" : "#1D1D1F",
                marginTop: 1,
              }}>
                {i + 1}
              </span>
              {stage.title}
            </p>
            <p className="kk-journey-indent" style={{ fontSize: 12.5, color: "var(--kk-ink-mute)", lineHeight: 1.5, marginBottom: 8 }}>
              <span className="kk-journey-full">{stage.desc}</span>
              <span className="kk-journey-short">{stage.descShort}</span>
            </p>
            <p className="kk-journey-indent" style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-ink-faint)", letterSpacing: "0.02em" }}>
              {stage.when}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        .kk-journey-short { display: none; }
        .kk-journey-num { display: none; }
        @media (max-width: 720px) {
          .kk-journey-grid { grid-template-columns: repeat(2, 1fr) !important; row-gap: 18px !important; column-gap: 14px !important; }
          .kk-journey-full { display: none !important; }
          .kk-journey-short { display: inline !important; }
          .kk-journey-num { display: flex !important; }
          .kk-journey-indent { margin-left: 22px !important; }
        }
      `}</style>
    </div>
  );
}
