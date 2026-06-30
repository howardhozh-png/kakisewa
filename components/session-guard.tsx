"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_MS = 2 * 60 * 60 * 1000; // 2 hours
const KEY = "kk_last_active";

function touch() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private browsing */ }
}

export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Reset idle timer whenever a sign-in occurs so a fresh login never
    // immediately triggers the stale-timestamp check below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") touch();
    });

    async function checkIdle() {
      // PWA users expect to stay logged in indefinitely — only sign out when they explicitly tap Sign out.
      // Supabase auto-refreshes the token every ~55 min, so session validity is handled separately.
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone) { touch(); return; }

      const raw = localStorage.getItem(KEY);
      const last = raw ? Number(raw) : 0;

      if (last > 0 && Date.now() - last > IDLE_MS) {
        // Before kicking out, verify the Supabase session is actually expired.
        // The SDK will auto-refresh a valid token — only redirect if that fails.
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          localStorage.removeItem(KEY);
          router.replace("/sign-in?reason=timeout");
          return;
        }
        // Session refreshed successfully — user is still authenticated, just idle
      }

      touch();
    }

    // Check on mount (handles page refresh after a long absence)
    checkIdle();

    // Check when user switches back to the tab/app (iOS Safari visibilitychange)
    function onVisible() {
      if (document.visibilityState === "visible") checkIdle();
    }
    document.addEventListener("visibilitychange", onVisible);

    // Keep timestamp fresh on any interaction so active users never get kicked
    const events = ["click", "keydown", "touchstart", "scroll"] as const;
    events.forEach(e => document.addEventListener(e, touch, { passive: true }));

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      events.forEach(e => document.removeEventListener(e, touch));
    };
  }, [router]);

  return null;
}
