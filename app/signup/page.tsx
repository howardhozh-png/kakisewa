"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const ADMIN_EMAIL = "howardhozh@gmail.com"

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    agency: "",
    ren_number: "",
    password: "",
    confirm: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isAdmin = form.email.trim().toLowerCase() === ADMIN_EMAIL
  const renRequired = !isAdmin

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError("Passwords do not match.")
      return
    }
    if (renRequired && !form.ren_number.trim()) {
      setError("REN number is required for agents. Contact us if you don't have one yet.")
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone: form.phone,
          agency: form.agency,
          ren_number: form.ren_number || null,
          is_admin: isAdmin,
        },
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push("/home")
    router.refresh()
  }

  const inputStyle = {
    fontSize: "var(--kk-body)",
    border: "1px solid var(--kk-line-strong)",
    background: "var(--kk-bg)",
    color: "var(--kk-ink)",
  } as const

  function Field({ label, name, type = "text", placeholder, required: req = true }: {
    label: string; name: keyof typeof form; type?: string; placeholder: string; required?: boolean
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>
          {label}{req && <span style={{ color: "var(--kk-ink-faint)" }}> *</span>}
        </label>
        <input
          type={type}
          required={req}
          value={form[name]}
          onChange={set(name)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="serif font-bold tracking-tight" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>
            kakisewa
          </p>
          <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)", marginTop: 4 }}>
            Create your agent account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <Field label="Full name" name="full_name" placeholder="Ahmad Firdaus" />
            <Field label="Email" name="email" type="email" placeholder="you@example.com" />
            <Field label="Phone" name="phone" type="tel" placeholder="+60 12-345 6789" />
            <Field label="Agency" name="agency" placeholder="IQI Global" />

            {/* REN number — required for regular agents, optional for admin */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>
                  REN Number{renRequired && <span style={{ color: "var(--kk-ink-faint)" }}> *</span>}
                </label>
                {!renRequired && (
                  <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-green)", fontWeight: 600 }}>
                    Admin — not required
                  </span>
                )}
              </div>
              <input
                type="text"
                required={renRequired}
                value={form.ren_number}
                onChange={set("ren_number")}
                placeholder="REN12345"
                className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kk-green)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kk-line-strong)"}
              />
            </div>

            <div style={{ height: 1, background: "var(--kk-line)" }} />

            <Field label="Password" name="password" type="password" placeholder="At least 8 characters" />
            <Field label="Confirm password" name="confirm" type="password" placeholder="••••••••" />

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
                marginTop: 4,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>

          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--kk-green)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
