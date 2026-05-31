"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--kk-bg)" }}>

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
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>
            kakisewa
          </p>
        </div>

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
          <Link href="/signup" style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}
