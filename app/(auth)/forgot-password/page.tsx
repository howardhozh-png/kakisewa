"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-sm mb-4">
        <Link href="/sign-in" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor" aria-hidden="true">
            <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to sign in
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>kakisewa</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          {sent ? (
            <div className="text-center py-2">
              <p className="font-semibold mb-2" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>Check your email</p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                We sent a password reset link to <strong>{email}</strong>. Check your inbox and click the link to set a new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <p className="font-semibold mb-1" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>Reset your password</p>
                <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  style={{ fontSize: "var(--kk-body)", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"}
                />
              </div>

              {error && (
                <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-2.5 font-semibold transition-opacity"
                style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
