"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword]  = useState("")
  const [confirm, setConfirm]    = useState("")
  function onlyDigits(v: string) { return v.replace(/\D/g, "") }
  const [loading, setLoading]    = useState(false)
  const [error, setError]        = useState<string | null>(null)
  const [done, setDone]          = useState(false)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token  = params.get("access_token")
    const refresh_token = params.get("refresh_token")
    const type          = params.get("type")

    if (!access_token || !refresh_token || type !== "recovery") {
      setLinkError("Invalid or expired reset link. Please request a new one.")
      return
    }

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setLinkError("Link has expired. Please request a new password reset.")
        else setReady(true)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{8}$/.test(password)) { setError("Passcode must be exactly 8 digits."); return }
    if (password !== confirm) { setError("Passcodes don't match."); return }
    setLoading(true)
    const { error: err } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    await createClient().auth.signOut()
    setDone(true)
    setTimeout(() => router.push("/login"), 3000)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--kk-bg)" }}>
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>kakisewa</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          {done ? (
            <div className="text-center py-2 flex flex-col gap-3">
              <p className="text-2xl">✓</p>
              <p className="font-semibold" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>Passcode reset successful</p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>Redirecting you to login…</p>
            </div>
          ) : linkError ? (
            <div className="flex flex-col gap-4">
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}>
                {linkError}
              </p>
              <a href="/forgot-password" className="w-full rounded-xl py-2.5 font-semibold text-center block transition-opacity"
                style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff" }}>
                Request new link
              </a>
            </div>
          ) : !ready ? (
            <p className="text-center py-4" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>Verifying…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <p className="font-semibold mb-1" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}>Set new passcode</p>
                <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>Choose an 8-digit passcode for your account.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>New passcode</label>
                <input type="password" inputMode="numeric" pattern="[0-9]*" required maxLength={8}
                  value={password} onChange={e => setPassword(onlyDigits(e.target.value))}
                  placeholder="8 digits" className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all text-center tracking-widest"
                  style={{ fontSize: "1.25rem", letterSpacing: "0.4em", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Confirm passcode</label>
                <input type="password" inputMode="numeric" pattern="[0-9]*" required maxLength={8}
                  value={confirm} onChange={e => setConfirm(onlyDigits(e.target.value))}
                  placeholder="8 digits" className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all text-center tracking-widest"
                  style={{ fontSize: "1.25rem", letterSpacing: "0.4em", border: "1px solid var(--kk-line-strong)", background: "var(--kk-bg)", color: "var(--kk-ink)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"} />
              </div>

              {error && (
                <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}>{error}</p>
              )}

              <button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 font-semibold transition-opacity"
                style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Updating…" : "Update passcode"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
