"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function PageviewTracker() {
  const ph = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    ph?.capture("$pageview", { $current_url: window.location.href });
  }, [ph, pathname, searchParams]);

  return null;
}

function UserIdentifier() {
  const ph = usePostHog();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        ph?.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        ph?.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
        });
      } else if (event === "SIGNED_OUT") {
        ph?.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
      enable_heatmaps: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true },
      },
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
        <UserIdentifier />
      </Suspense>
      {children}
    </PHProvider>
  );
}
