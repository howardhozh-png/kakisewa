"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"

const ADMIN_EMAIL = "howardhozh@gmail.com"

const SHAPES = [
  { label: "3 bed · 2 bath",       sub: "Mont Kiara · RM 4,200/mo",    x: "-2%",  y: "12%", rotate: -8, delay: 0    },
  { label: "Lease renewed ✓",       sub: "Damansara Perdana · 2 yr",    x: "66%",  y: "8%",  rotate:  6, delay: 0.3  },
  { label: "New tenant matched",    sub: "Aishah Tan · RM 2,800/mo",    x: "8%",   y: "65%", rotate: -4, delay: 0.6  },
  { label: "Support contact saved ✓", sub: "TNB electrician · Ampang",    x: "70%",  y: "58%", rotate:  5, delay: 0.15 },
  { label: "Commission due",        sub: "Shah Alam · RM 2,400",        x: "-3%",  y: "40%", rotate: -5, delay: 0.5  },
  { label: "Contract expiring",     sub: "Bandar Utama · 30 days",      x: "68%",  y: "33%", rotate:  3, delay: 0.8  },
  { label: "Owner intro call ✓",    sub: "Encik Farid · Cheras",        x: "33%",  y: "86%", rotate: -2, delay: 0.95 },
]

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refSlug = searchParams.get("ref") ?? null
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", agency: "", ren_number: "", password: "", confirm: "" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [renStatus, setRenStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle")
  const [renHint, setRenHint] = useState<string | null>(null)

  const isAdmin = form.email.trim().toLowerCase() === ADMIN_EMAIL

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function validateRen(ren: string) {
    const numeric = ren.replace(/^REN\s*/i, "").trim()
    if (!numeric || !/^\d+$/.test(numeric)) {
      setRenStatus("invalid")
      setRenHint("Format: REN followed by numbers, e.g. REN07128")
      return
    }
    setRenStatus("checking")
    setRenHint(null)
    try {
      const res = await fetch(`/api/validate-ren?ren=${encodeURIComponent(ren)}`)
      const data = await res.json()
      if (data.valid) {
        setRenStatus("valid")
        const parts = [data.name, data.firm].filter(Boolean)
        setRenHint(parts.length ? parts.join(" · ") : (data.active === false ? "Found — not active" : "Verified"))
      } else {
        setRenStatus("invalid")
        setRenHint("REN not found in LPPEH registry")
      }
    } catch {
      setRenStatus("idle")
      setRenHint(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) { setError("Passwords do not match."); return }
    if (!isAdmin && !form.ren_number.trim()) { setError("REN number is required."); return }
    if (!isAdmin && renStatus === "invalid") { setError("Please enter a valid REN number."); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(), phone: form.phone, agency: form.agency || null, ren_number: form.ren_number || null, is_admin: isAdmin, referral_slug: refSlug },
      },
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push("/sign-up/verify")
  }

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
  const inputStyle: React.CSSProperties = {
    fontSize: "var(--kk-body)",
    border: "1px solid var(--kk-line-strong)",
    background: "var(--kk-bg)",
    color: "var(--kk-ink)",
  }
  function onFocus(e: React.FocusEvent<HTMLInputElement>) { e.currentTarget.style.borderColor = "var(--kk-green)" }
  function onBlur(e: React.FocusEvent<HTMLInputElement>)  { e.currentTarget.style.borderColor = "var(--kk-line-strong)" }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden" style={{ background: "var(--kk-bg)" }}>

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
        <Link href="/" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
          style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
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
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Create your agent account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 flex flex-col gap-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>First name <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="text" required value={form.first_name} onChange={set("first_name")} placeholder="Ahmad" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Last name <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="text" required value={form.last_name} onChange={set("last_name")} placeholder="Firdaus" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Email <span style={{ color: "#DC2626" }}>*</span></label>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Phone <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="tel" required value={form.phone} onChange={set("phone")} placeholder="60107609699" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Agency/Company</label>
                <input type="text" value={form.agency} onChange={set("agency")} placeholder="IQI Global" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>
                  REN Number {!isAdmin && <span style={{ color: "#DC2626" }}>*</span>}
                </label>
                {isAdmin && <span className="text-[11px] font-semibold" style={{ color: "var(--kk-green)" }}>Admin — not required</span>}
              </div>
              <input
                type="text"
                required={!isAdmin}
                value={form.ren_number}
                onChange={e => { set("ren_number")(e); setRenStatus("idle"); setRenHint(null) }}
                onBlur={e => { onBlur(e); if (!isAdmin && e.target.value.trim()) validateRen(e.target.value.trim()) }}
                placeholder="REN07128"
                className={inputCls}
                style={{
                  ...inputStyle,
                  borderColor: renStatus === "valid" ? "var(--kk-green)" : renStatus === "invalid" ? "#DC2626" : undefined,
                }}
                onFocus={onFocus}
              />
              {renStatus === "checking" && (
                <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Checking LPPEH registry…</p>
              )}
              {renHint && renStatus === "valid" && (
                <p className="text-[11px] font-medium" style={{ color: "var(--kk-green)" }}>✓ {renHint}</p>
              )}
              {renHint && renStatus === "invalid" && (
                <p className="text-[11px]" style={{ color: "#DC2626" }}>{renHint}</p>
              )}
            </div>

            <div style={{ height: 1, background: "var(--kk-line)" }} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Password <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "var(--kk-sm)", fontWeight: 500, color: "var(--kk-ink)" }}>Confirm <span style={{ color: "#DC2626" }}>*</span></label>
                <input type="password" required value={form.confirm} onChange={set("confirm")} placeholder="••••••••" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            {error && (
              <p className="rounded-xl px-3.5 py-2.5" style={{ fontSize: "var(--kk-sm)", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 font-semibold transition-opacity"
              style={{ fontSize: "var(--kk-body)", background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: 2 }}>
              {loading ? "Creating account…" : "Create account"}
            </button>

          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Already have an account?{" "}
          <Link href="/sign-in" style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
