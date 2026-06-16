"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PasscodeInput } from "@/components/passcode-input"

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
  const searchParams = useSearchParams()
  const timedOut = searchParams.get("reason") === "timeout"
  const [email, setEmail] = useState("")
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.")
        setLoading(false)
        return
      }

      window.location.href = "/home"
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
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
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Welcome back</p>
        </div>

        {/* Session timeout notice */}
        {timedOut && (
          <div className="mb-4 rounded-xl px-4 py-3 text-[13px] font-medium text-center" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
            Your session has expired. Please log in again.
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-7 flex flex-col gap-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>Email</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="kakisewa@example.com"
                className="rounded-xl h-auto py-2.5 px-3.5"
                style={{ fontSize: "var(--kk-body)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>Passcode</Label>
                <Link href="/forgot-password" tabIndex={-1} style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Forgot passcode?
                </Link>
              </div>
              <PasscodeInput value={passcode} onChange={setPasscode} autoComplete="current-password" required />
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
              <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
            </div>

            {/* Google */}
            <GoogleSignInButton
              onError={setError}
              onLoadingChange={setGoogleLoading}
            />

            {error && (
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "var(--destructive)", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl h-auto py-2.5"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}
