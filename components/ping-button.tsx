"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { markReminderSent } from "@/lib/actions";
import { toast } from "sonner";

export function PingButton({ tenancyId, whatsappUrl }: { tenancyId: string; whatsappUrl: string }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handlePing() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      await markReminderSent(tenancyId);
      setSent(true);
      toast.success("Reminder sent.");
    });
  }

  return (
    <button
      onClick={handlePing}
      disabled={pending}
      className={`kk-pill ${sent ? "kk-pill-soft-green" : "kk-pill-ghost"}`}
    >
      {sent ? <><Check className="w-3.5 h-3.5" /> Sent</> : <><WhatsAppIcon className="w-3.5 h-3.5" /> Ping</>}
    </button>
  );
}
