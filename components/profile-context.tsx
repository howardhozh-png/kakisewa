"use client"

import { createContext, useContext } from "react"
import type { AgentProfile } from "@/lib/types"

const ProfileContext = createContext<AgentProfile | null>(null)

export function ProfileProvider({ profile, children }: { profile: AgentProfile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
}

export function useProfile(): AgentProfile {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider")
  return ctx
}
