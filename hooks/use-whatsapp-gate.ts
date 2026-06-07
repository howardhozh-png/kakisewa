"use client"

import { useState } from "react"
import { useProfile } from "@/components/profile-context"
import { getMissingWhatsAppFields } from "@/lib/profile-gate"
import type { MissingProfileField } from "@/lib/profile-gate"

export function useWhatsAppGate() {
  const profile = useProfile()
  const [gateOpen, setGateOpen] = useState(false)
  const [missingFields, setMissingFields] = useState<MissingProfileField[]>([])

  function checkAndRun(action: () => void) {
    const missing = getMissingWhatsAppFields(profile)
    if (missing.length > 0) {
      setMissingFields(missing)
      setGateOpen(true)
      return
    }
    action()
  }

  return { gateOpen, setGateOpen, missingFields, checkAndRun }
}
