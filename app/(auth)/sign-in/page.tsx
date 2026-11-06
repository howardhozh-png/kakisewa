"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { usePostHog } from "posthog-js/react"
import { track } from "@/lib/analytics"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PasscodeInput } from "@/components/passcode-input"
import { PoweredByBadge } from "@/components/powered-by-badge"
import { Logo } from "@/components/logo"

// See sign-up/page.tsx for why this overrides --primary via a wrapper div
// instead of passing style directly to the Button primitive.
const primaryBtnVars = { "--primary": "var(--kk-blue)", "--primary-foreground": "#fff" } as React.CSSProperties

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
  const ph = usePostHog()

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

      track(ph, "user_signed_in", { method: "passcode" })
      window.location.href = "/home"
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6" style={{ background: "var(--kk-bg)" }}>

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

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-5">
          <Logo variant="wordmark" size={30} />
          <h1 className="serif mt-2.5" style={{ fontSize: "1.5rem", lineHeight: 1.2, letterSpacing: "-0.01em", color: "var(--kk-ink)" }}>
            Welcome back.
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            Your renewals are still being tracked.
          </p>
        </div>

        {/* Session timeout notice */}
        {timedOut && (
          <div className="mb-4 rounded-xl px-4 py-3 text-[13px] font-medium text-center" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
            Your session has expired. Please log in again.
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-6 flex flex-col gap-3.5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 1px 2px rgba(29,29,31,0.05), 0 20px 44px -22px rgba(29,29,31,0.25)" }}>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

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

            <div style={primaryBtnVars}>
              <Button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-xl h-auto py-2.5"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </div>

          </form>
        </div>

        <p className="text-center mt-4" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            style={{ color: "var(--kk-blue)", fontWeight: 600, textDecoration: "none" }}
          >
            Sign up
          </Link>
        </p>
        <PoweredByBadge />

      </div>
    </div>
  )
}
