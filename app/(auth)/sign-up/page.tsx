"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { usePostHog } from "posthog-js/react"
import { createClient } from "@/lib/supabase/client"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PasscodeInput } from "@/components/passcode-input"
import { STORY_BEATS } from "@/lib/hook-content"

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "howardhozh@gmail.com"

const sharedInputCls = "rounded-xl h-auto py-2.5 px-3.5"
const sharedInputStyle: React.CSSProperties = { fontSize: "var(--kk-body)", background: "var(--kk-bg)", color: "var(--kk-ink)" }

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}

type View = "form" | "email_sent"

function SignUpForm() {
  const searchParams = useSearchParams()
  const ph = usePostHog()

  const [form, setForm] = useState({ email: "", passcode: "" })
  const [refCode, setRefCode] = useState(searchParams.get("ref") ?? "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>("form")

  const isAdmin = form.email.trim().toLowerCase() === ADMIN_EMAIL
  const effectiveRef = refCode.trim() || null

  function set(field: "email" | "passcode") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value
      if (field === "passcode") v = v.replace(/\D/g, "")
      setForm(f => ({ ...f, [field]: v }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{8}$/.test(form.passcode)) { setError("Passcode must be exactly 8 digits."); return }
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.passcode,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            is_admin: isAdmin,
            referred_by: effectiveRef,
          },
        },
      })
      if (err) { setError(err.message); setLoading(false); return }
      ph?.capture("user_signed_up", { email: form.email, referral_slug: effectiveRef })
      setLoading(false)
      setView("email_sent")
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const card = (children: React.ReactNode) => (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-sm mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
          style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor" aria-hidden="true">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          kakisewa.com
        </Link>
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>kakisewa</p>
        </div>
        {children}
      </div>
    </div>
  )

  if (view === "email_sent") {
    return card(
      <div className="rounded-2xl p-7 flex flex-col items-center gap-4 text-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#DCFCE7" }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--kk-green)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold" style={{ color: "var(--kk-ink)", fontSize: "var(--kk-body)" }}>Verify your email to activate</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            An email has been sent to{" "}
            <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>{form.email}</span>.
            Kindly click the link to activate your account.
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
            If you don&apos;t click the link, no account will be created.
          </p>
        </div>
        <Link href="/sign-in" className="w-full rounded-xl py-2.5 font-semibold text-center transition-opacity hover:opacity-80"
          style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff", marginTop: 4 }}>
          Back to sign in
        </Link>
      </div>
    )
  }

  // Default: signup form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-sm mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
          style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor" aria-hidden="true">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          kakisewa.com
        </Link>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>kakisewa</p>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Join kakisewa today!</p>
        </div>

        {/* Reinforce the landing page's loss-aversion hooks — this context was
            previously lost entirely by the time someone reached the signup form. */}
        <div className="flex flex-col gap-1.5 mb-6 text-center">
          {STORY_BEATS.slice(0, 3).map((beat, i) => (
            <p key={i} style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.5 }}>
              {beat.quote}{" "}
              <strong style={{ color: beat.accentColor }}>{beat.emphasis}</strong>
              {beat.quotePost ? ` ${beat.quotePost}` : ""}
            </p>
          ))}
        </div>

        <div className="rounded-2xl p-7 flex flex-col gap-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>Email</Label>
              <Input type="email" required autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} placeholder="you@example.com"
                className={sharedInputCls} style={sharedInputStyle} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>Passcode</Label>
              <PasscodeInput value={form.passcode} onChange={v => setForm(f => ({ ...f, passcode: v }))} autoComplete="new-password" required variant="create" />
              <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Create your own 8-digit passcode, you&apos;ll use it to sign in next time.</p>
            </div>

            {/* Referral code */}
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>
                Referral code{" "}
                <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400 }}>(optional)</span>
              </Label>
              <div style={{ position: "relative" }}>
                <Input
                  type="text"
                  value={refCode}
                  onChange={e => setRefCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3F92C1"
                  className={sharedInputCls}
                  style={{ ...sharedInputStyle, letterSpacing: "0.05em", paddingRight: refCode ? 80 : undefined }}
                />
                {refCode && (
                  <span style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, fontWeight: 700, color: "var(--kk-green)",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <svg viewBox="0 0 12 12" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                    Applied
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
              <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
            </div>

            <GoogleSignInButton onError={setError} refCode={effectiveRef} />

            {error && (
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "var(--destructive)", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-xl h-auto py-2.5 mt-0.5">
              {loading ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-center" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
              2 months free, then starting at RM29/month, about RM1/day. Cancel anytime.
            </p>
          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Already have an account?{" "}
          <Link href="/sign-in" style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sign in
          </Link>
        </p>
        <p className="text-center mt-3" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", lineHeight: 1.6 }}>
          By creating an account you agree to our{" "}
          <Link href="/terms" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
