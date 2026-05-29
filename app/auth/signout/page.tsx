"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      router.push("/login")
      router.refresh()
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kk-bg)" }}>
      <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>Signing out…</p>
    </div>
  )
}
