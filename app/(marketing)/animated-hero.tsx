"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { SeeHowButton } from "./see-how-button"

export function AnimatedHero() {
  const [titleNumber, setTitleNumber] = useState(0)
  const titles = useMemo(
    () => ["every renewal", "passive income", "each listing", "your pipeline", "every commission"],
    []
  )

  useEffect(() => {
    const id = setTimeout(() => {
      setTitleNumber(n => (n === titles.length - 1 ? 0 : n + 1))
    }, 2200)
    return () => clearTimeout(id)
  }, [titleNumber, titles])

  return (
    <section className="px-6 lg:px-12 pt-24 pb-12 text-center" style={{ background: "var(--kk-bg)" }}>

      <h1
        className="serif mx-auto"
        style={{ fontSize: "clamp(3rem, 7vw, 6rem)", lineHeight: 1.05, letterSpacing: "-0.025em", maxWidth: "20ch", marginBottom: 36 }}
      >
        <span style={{ color: "var(--kk-ink)" }}>Make more money from</span>
        <span className="relative flex w-full justify-center overflow-hidden" style={{ height: "1.4em", marginTop: "0.05em" }}>
          {titles.map((title, index) => (
            <motion.span
              key={index}
              className="absolute font-semibold"
              style={{ color: "var(--kk-green)" }}
              initial={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
              animate={
                titleNumber === index
                  ? { y: 0, opacity: 1 }
                  : { y: titleNumber > index ? -80 : 80, opacity: 0 }
              }
            >
              {title}
            </motion.span>
          ))}
        </span>
      </h1>

      <p
        className="mx-auto mb-10"
        style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "var(--kk-ink-mute)", lineHeight: 1.6, maxWidth: "48ch" }}
      >
        Renewal commission is passive income. Most agents leave it on the table
        because they have no system. kakisewa makes sure you never miss another one.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body-lg)" }}
        >
          Start free trial <ArrowRight className="w-4 h-4" />
        </Link>
        <SeeHowButton />
      </div>
      <p className="mt-4 text-xs" style={{ color: "var(--kk-ink-faint)" }}>
        Limited spots available
      </p>
    </section>
  )
}
