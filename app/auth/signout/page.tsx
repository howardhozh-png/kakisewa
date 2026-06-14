"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SignOutPage() {
  useEffect(() => {
    async function doSignOut() {
      // Remove push subscription before session is cleared so the DELETE
      // request is still authenticated.
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await fetch("/api/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            });
            await sub.unsubscribe();
          }
        }
      } catch {
        // Non-fatal — proceed with sign-out regardless
      }
      // Clear push subscribed flag so re-login prompts re-subscription
      localStorage.removeItem("kk_push_subscribed");

      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    }
    doSignOut();
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kk-bg)" }}>
      <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)" }}>Signing out…</p>
    </div>
  )
}
