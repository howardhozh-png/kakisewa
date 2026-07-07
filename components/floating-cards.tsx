"use client"

import { motion } from "framer-motion"

export interface FloatingCardData {
  label: string
  sub: string
  x: string
  y: string
  rotate: number
  delay: number
  accentColor?: string
}

// Shared floating-card visual — originally sign-in only, now reused on
// sign-up too so both auth pages share the same "beautifully designed"
// look instead of plain stacked text. Desktop only (hidden lg:block),
// same as the original: not enough room to float these without
// colliding with the form on mobile widths.
export function FloatingCards({ cards }: { cards: FloatingCardData[] }) {
  return (
    <>
      {cards.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: s.delay },
            y: { duration: 4 + s.delay, repeat: Infinity, ease: "easeInOut", delay: s.delay },
          }}
          className="absolute hidden lg:block rounded-2xl px-4 py-3"
          style={{
            left: s.x, top: s.y, rotate: s.rotate,
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            minWidth: 180,
            maxWidth: 230,
          }}
          aria-hidden="true"
        >
          <p className="font-semibold text-[13px] leading-tight" style={{ color: s.accentColor ?? "var(--kk-ink)" }}>{s.label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{s.sub}</p>
        </motion.div>
      ))}
    </>
  )
}
