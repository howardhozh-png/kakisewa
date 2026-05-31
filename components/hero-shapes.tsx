"use client";

import { motion } from "framer-motion";

const shapes = [
  { label: "3 bed · 2 bath", sub: "Mont Kiara · RM 4,200/mo", x: "-5%", y: "15%", rotate: -8, delay: 0 },
  { label: "Lease renewed ✓", sub: "Damansara Perdana · 2 yr", x: "68%", y: "8%", rotate: 6, delay: 0.3 },
  { label: "New tenant matched", sub: "Aishah Tan · RM 2,800/mo", x: "10%", y: "62%", rotate: -4, delay: 0.6 },
  { label: "Support contact saved ✓", sub: "TNB electrician · Ampang", x: "72%", y: "55%", rotate: 5, delay: 0.15 },
  { label: "Commission earned", sub: "RM 4,200 · Jun 2026", x: "38%", y: "78%", rotate: -6, delay: 0.45 },
];

export function HeroShapes() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {shapes.map((s) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: s.delay },
            y: { duration: 4 + s.delay, repeat: Infinity, ease: "easeInOut", delay: s.delay },
          }}
          className="absolute px-4 py-3 rounded-2xl backdrop-blur-md"
          style={{
            left: s.x,
            top: s.y,
            rotate: s.rotate,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            minWidth: 180,
          }}
        >
          <p className="text-white font-semibold text-[13px] leading-tight">{s.label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{s.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
