"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { MissingProfileField } from "@/lib/profile-gate"

interface WhatsAppGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missingFields: MissingProfileField[]
}

export function WhatsAppGateDialog({ open, onOpenChange, missingFields }: WhatsAppGateDialogProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(220,38,38,0.08)" }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "#DC2626" }} />
            </div>
            <div>
              <p className="font-semibold text-[15px] leading-snug" style={{ color: "var(--kk-ink)" }}>
                Message will look incomplete
              </p>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                The owner will see blank fields where your info should appear. Complete your profile to send a professional message.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl px-4 py-3" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kk-ink-faint)" }}>
            Missing fields
          </p>
          <ul className="flex flex-col gap-1.5">
            {missingFields.map(f => (
              <li key={f.key} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--kk-ink)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#DC2626" }} />
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full rounded-xl h-auto py-2.5"
            onClick={() => { onOpenChange(false); router.push("/settings/account") }}
          >
            Complete profile
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-xl h-auto py-2.5 text-[13px]"
            style={{ color: "var(--kk-ink-mute)" }}
            onClick={() => { onOpenChange(false); router.push("/settings/account#templates") }}
          >
            Edit message template instead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
