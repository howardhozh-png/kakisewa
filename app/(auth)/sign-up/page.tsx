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

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "howardhozh@gmail.com"

const SPEND_OPTIONS = [
  { value: "<50",     label: "Less than RM50" },
  { value: "50-100",  label: "RM50 – RM100" },
  { value: "100-200", label: "RM100 – RM200" },
  { value: "200-300", label: "RM200 – RM300" },
  { value: "300-500", label: "RM300 – RM500" },
  { value: ">500",    label: "More than RM500" },
] as const

const sharedInputCls = "rounded-xl h-auto py-2.5 px-3.5"
const sharedInputStyle: React.CSSProperties = { fontSize: "var(--kk-body)", background: "var(--kk-bg)", color: "var(--kk-ink)" }

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}

type View = "form" | "waitlist" | "waitlist_done" | "email_sent"

function SignUpForm() {
  const searchParams = useSearchParams()
  const refSlug = searchParams.get("ref") ?? null
  const errorParam = searchParams.get("error")
  const emailParam = searchParams.get("email") ?? ""
  const ph = usePostHog()

  const [form, setForm] = useState({ email: "", passcode: "" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>(errorParam === "not_invited" ? "waitlist" : "form")

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState(errorParam === "not_invited" ? emailParam : "")
  const [waitlistRen, setWaitlistRen] = useState("")
  const [waitlistSpend, setWaitlistSpend] = useState("")
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  const isAdmin = form.email.trim().toLowerCase() === ADMIN_EMAIL


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
      // Check invite before creating any auth account
      if (!isAdmin) {
        const res = await fetch("/api/auth/check-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
        })
        const { invited } = await res.json()
        if (!invited) {
          setWaitlistEmail(form.email.trim().toLowerCase())
          setLoading(false)
          setView("waitlist")
          return
        }
      }

      const supabase = createClient()
      const { error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.passcode,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            is_admin: isAdmin,
            referral_slug: refSlug,
          },
        },
      })
      if (err) { setError(err.message); setLoading(false); return }
      ph?.capture("user_signed_up", { email: form.email, referral_slug: refSlug })
      setLoading(false)
      setView("email_sent")
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setWaitlistLoading(true)
    try {
      await fetch("/api/auth/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistEmail,
          ren_number: waitlistRen.trim() || undefined,
          expected_spend: waitlistSpend || undefined,
        }),
      })
      setWaitlistLoading(false)
      setView("waitlist_done")
    } catch {
      setWaitlistLoading(false)
    }
  }

  function handleNotInvited(email: string) {
    setWaitlistEmail(email)
    setView("waitlist")
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

  if (view === "waitlist_done") {
    return card(
      <div className="rounded-2xl p-7 flex flex-col items-center gap-4 text-center" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#DCFCE7" }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--kk-green)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold" style={{ color: "var(--kk-ink)", fontSize: "var(--kk-body)" }}>You&apos;re on the list</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            We&apos;ll reach out to <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>{waitlistEmail}</span> when a spot opens up.
          </p>
        </div>
        <Link href="/" className="w-full rounded-xl py-2.5 font-semibold text-center transition-opacity hover:opacity-80"
          style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff", marginTop: 4 }}>
          Back to kakisewa.com
        </Link>
      </div>
    )
  }

  if (view === "waitlist") {
    return card(
      <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
        {/* Header */}
        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(220,38,38,0.08)" }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#DC2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p className="font-bold text-[17px] leading-snug mb-1.5" style={{ color: "var(--kk-ink)" }}>
            kakisewa is in exclusive beta
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            We&apos;re onboarding only <strong style={{ color: "var(--kk-ink)" }}>20 agents</strong>{" "}in this round. Join the waitlist and we&apos;ll contact you when a spot opens.
          </p>
        </div>

        <form onSubmit={handleWaitlist} className="flex flex-col gap-4">
          {/* Email — pre-filled read-only */}
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>Email</Label>
            <Input
              type="email" readOnly value={waitlistEmail}
              className={sharedInputCls}
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", cursor: "not-allowed" }}
            />
          </div>

          {/* REN number */}
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)" }}>REN number <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400 }}>(optional)</span></Label>
            <Input
              type="text" value={waitlistRen} onChange={e => setWaitlistRen(e.target.value)}
              placeholder="e.g. REN07128 or PEA1234"
              className={sharedInputCls} style={sharedInputStyle}
            />
          </div>

          {/* Pricing survey */}
          <div className="flex flex-col gap-2">
            <div>
              <p style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)", marginBottom: 6 }}>
                How much would you pay for this tool if it helps you to:
              </p>
              <ul className="flex flex-col gap-1" style={{ paddingLeft: 4 }}>
                {[
                  "Track all leads and never lose a single one",
                  "Get reminders on every upcoming renewal",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>
                    <span style={{ marginTop: 1, flexShrink: 0, color: "var(--kk-green)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {SPEND_OPTIONS.map(opt => {
                const selected = waitlistSpend === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWaitlistSpend(opt.value)}
                    className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      border: `1.5px solid ${selected ? "var(--kk-green)" : "var(--kk-line-strong)"}`,
                      background: selected ? "rgba(16,185,129,0.06)" : "var(--kk-bg)",
                    }}
                  >
                    <span className="flex-shrink-0 rounded-full flex items-center justify-center" style={{
                      width: 18, height: 18,
                      border: `2px solid ${selected ? "var(--kk-green)" : "var(--kk-line-strong)"}`,
                      background: selected ? "var(--kk-green)" : "transparent",
                    }}>
                      {selected && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />
                      )}
                    </span>
                    <span className="text-[13px] font-medium" style={{ color: selected ? "var(--kk-ink)" : "var(--kk-ink-mute)" }}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            type="submit"
            disabled={waitlistLoading}
            className="w-full rounded-xl h-auto py-2.5 mt-0.5"
          >
            {waitlistLoading ? "Joining…" : "Join waitlist"}
          </Button>
        </form>

        <p className="text-center text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
          Already have an invite?{" "}
          <button onClick={() => setView("form")} className="underline font-medium" style={{ color: "var(--kk-ink)" }}>
            Go back
          </button>
        </p>
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
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>kakisewa</p>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Join kakisewa today!</p>
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
              <PasscodeInput value={form.passcode} onChange={v => setForm(f => ({ ...f, passcode: v }))} autoComplete="new-password" required />
              <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>8 digits — you&apos;ll use this to sign in</p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
              <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--kk-line)" }} />
            </div>

            <GoogleSignInButton onError={setError} />

            {error && (
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "var(--destructive)", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-xl h-auto py-2.5 mt-0.5">
              {loading ? "Checking…" : "Create account"}
            </Button>
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
