"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_MS = 4 * 60 * 60 * 1000; // 4 hours
const KEY = "kk_last_active";

function touch() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private browsing */ }
}

export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    async function checkIdle() {
      const raw = localStorage.getItem(KEY);
      const last = raw ? Number(raw) : 0;

      if (last > 0 && Date.now() - last > IDLE_MS) {
        // Idle too long — sign out and redirect
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/sign-in?reason=timeout");
        return;
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
      document.removeEventListener("visibilitychange", onVisible);
      events.forEach(e => document.removeEventListener(e, touch));
    };
  }, [router]);

  return null;
}
