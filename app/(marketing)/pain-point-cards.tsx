"use client";

import React from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

interface Point {
  num: string;
  hook: React.ReactNode;
  quote: string;
  role: string;
}

const POINTS: Point[] = [
  {
    num: "01",
    hook: (
      <>
        You&rsquo;re losing{" "}
        <span style={{ color: "#DC2626" }}>passive income</span>
        {" "}every month.{" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>You just can&rsquo;t see it.</span>
      </>
    ),
    quote: "I forgot which contract was expiring. Found out when the owner texted asking for a new tenant. Someone else was already showing the unit. That renewal commission was mine and I lost it.",
    role: "Property agent · 6 years · Kuala Lumpur",
  },
  {
    num: "02",
    hook: (
      <>
        You can&rsquo;t see{" "}
        <span style={{ color: "#DC2626" }}>the next 3 years</span>
        {" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>of your own income.</span>
      </>
    ),
    quote: "I had no idea which contracts were expiring or which owners would be free in 6 months. I was always reacting. kakisewa shows me the next 2 years at a glance.",
    role: "Independent negotiator · 4 years · Petaling Jaya",
  },
  {
    num: "03",
    hook: (
      <>
        Sending WhatsApp texts to owners.{" "}
        <span style={{ color: "#DC2626" }}>No brand, no tracking.</span>
      </>
    ),
    quote: "I'd send 10 WhatsApp messages and get 1 reply. Once I started using a branded tenant pack link, owners responded faster and took me more seriously. Conversion went up straight away.",
    role: "Senior negotiator · 5 years · Subang Jaya",
  },
];

function Card({ pt, index }: { pt: Point; index: number }) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [7, -7]), { stiffness: 250, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-7, 7]), { stiffness: 250, damping: 28 });
  const sheenBg = useTransform(
    [mouseX, mouseY],
    ([x, y]: number[]) =>
      `radial-gradient(circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(255,255,255,0.16) 0%, transparent 58%)`
  );

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.72, delay: index * 0.13, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: "100%" }}
    >
      <motion.div
        animate={{ y: [0, -11, 0] }}
        transition={{
          duration: 4.2 + index * 0.65,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.95,
          repeatDelay: 0,
        }}
        style={{ perspective: "1000px", height: "100%" }}
      >
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            position: "relative",
          }}
          className="rounded-3xl overflow-hidden"
        >
          {/* Card body */}
          <div
            className="text-center flex flex-col h-full"
            style={{
              background: "#fff",
              borderRadius: "1.5rem",
              padding: "clamp(2rem, 3vw, 2.75rem)",
              boxShadow:
                "0 24px 64px -16px rgba(0,0,0,0.13), 0 4px 18px -4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
              cursor: "default",
              minHeight: 420,
            }}
          >
            <p
              className="serif font-black"
              style={{
                fontSize: "clamp(3rem, 4.5vw, 4.5rem)",
                color: "var(--kk-line-strong)",
                lineHeight: 1,
                marginBottom: "1.5rem",
                letterSpacing: "-0.04em",
              }}
            >
              {pt.num}
            </p>
            <h2
              className="serif mb-5"
              style={{
                fontSize: "clamp(1.5rem, 2vw, 2.15rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.022em",
                color: "var(--kk-ink)",
              }}
            >
              {pt.hook}
            </h2>
            <p
              style={{
                fontSize: "clamp(0.78rem, 0.85vw, 0.875rem)",
                color: "var(--kk-ink-faint)",
                fontStyle: "italic",
                lineHeight: 1.78,
                flexGrow: 1,
              }}
            >
              &ldquo;{pt.quote}&rdquo;
            </p>
            <p
              style={{
                fontSize: "var(--kk-xs)",
                color: "var(--kk-ink-faint)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                marginTop: "1.75rem",
                opacity: 0.55,
              }}
            >
              {pt.role}
            </p>
          </div>

          {/* Mouse-follow sheen overlay */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "1.5rem",
              background: sheenBg,
              pointerEvents: "none",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function PainPointCards() {
  return (
    <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-7 lg:gap-8 items-stretch">
      {POINTS.map((pt, i) => (
        <Card key={pt.num} pt={pt} index={i} />
      ))}
    </div>
  );
}
