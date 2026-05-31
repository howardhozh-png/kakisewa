"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"

const SHAPES = [
  { label: "3 bed · 2 bath", sub: "Mont Kiara · RM 4,200/mo", x: "-2%", y: "12%", rotate: -8, delay: 0 },
  { label: "Lease renewed ✓", sub: "Damansara Perdana · 2 yr", x: "66%", y: "8%", rotate: 6, delay: 0.3 },
  { label: "New tenant matched", sub: "Aishah Tan · RM 2,800/mo", x: "8%", y: "65%", rotate: -4, delay: 0.6 },
  { label: "Support contact saved ✓", sub: "TNB electrician · Ampang", x: "70%", y: "58%", rotate: 5, delay: 0.15 },
  { label: "Commission due", sub: "Shah Alam · RM 2,400", x: "-3%", y: "40%", rotate: -5, delay: 0.5 },
  { label: "Contract expiring", sub: "Bandar Utama · 30 days", x: "68%", y: "33%", rotate: 3, delay: 0.8 },
  { label: "Owner intro call ✓", sub: "Encik Farid · Cheras", x: "33%", y: "86%", rotate: -2, delay: 0.95 },
]

export default function SignInPage() {
  return <Suspense><SignInForm /></Suspense>;
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timedOut = searchParams.get("reason") === "timeout"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push("/home")
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden" style={{ background: "var(--kk-bg)" }}>

      {/* Floating property cards */}
      {SHAPES.map((s) => (
        <motion.div
          key={s.label}
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
          }}
          aria-hidden="true"
        >
          <p className="font-semibold text-[13px] leading-tight" style={{ color: "var(--kk-ink)" }}>{s.label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{s.sub}</p>
        </motion.div>
      ))}

      {/* Back link */}
      <div className="w-full max-w-sm mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
          style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}
        >
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor" aria-hidden="true">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          kakisewa.com
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>
            kakisewa
          </p>
        </div>

        {/* Session timeout notice */}
        {timedOut && (
          <div className="mb-4 rounded-xl px-4 py-3 text-[13px] font-medium text-center" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
            Your session has expired. Please log in again.
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="kakisewa@example.com"
                className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
                style={{
                  fontSize: "var(--kk-body)",
                  border: "1px solid var(--kk-line-strong)",
                  background: "var(--kk-bg)",
                  color: "var(--kk-ink)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=""
                className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
                style={{
                  fontSize: "var(--kk-body)",
                  border: "1px solid var(--kk-line-strong)",
                  background: "var(--kk-bg)",
                  color: "var(--kk-ink)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"}
              />
            </div>

            {error && (
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 font-semibold transition-opacity"
              style={{
                fontSize: "var(--kk-body)",
                background: "var(--kk-ink)",
                color: "#fff",
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}
