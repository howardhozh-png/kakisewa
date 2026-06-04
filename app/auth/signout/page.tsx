"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SignOutPage() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      window.location.href = "/sign-in"
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kk-bg)" }}>
      <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>Signing out…</p>
    </div>
  )
}
