"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { generateTenantIntakeLink } from "@/lib/actions";
import { toast } from "sonner";

export function TenantIntakeButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle() {
    startTransition(async () => {
      const res = await generateTenantIntakeLink();
      if (!res.ok) { toast.error(res.message); return; }
      // Copy link to clipboard and open WhatsApp
      try { await navigator.clipboard.writeText(res.url); } catch { /* ignore */ }
      window.open(res.waUrl, "_blank", "noopener,noreferrer");
      toast.success("Intake link copied. Send via WhatsApp.");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="kk-pill flex items-center gap-2 px-4 py-2"
      style={{ fontSize: "13px", fontWeight: 500, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      New tenant intake
    </button>
  );
}
