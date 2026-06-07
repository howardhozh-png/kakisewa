"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onError?: (msg: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onNotInvited?: (email: string) => void;
}

export function GoogleSignInButton({ onError, onLoadingChange, onNotInvited }: Props) {
  const router = useRouter();
  const btnRef = useRef<HTMLDivElement>(null);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      onLoadingChange?.(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (error) {
        onError?.(error.message);
        onLoadingChange?.(false);
        return;
      }
      const email = data.user?.email ?? "";
      if (onNotInvited && email) {
        const res = await fetch("/api/auth/check-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const { invited } = await res.json().catch(() => ({ invited: false }));
        if (!invited) {
          await supabase.auth.signOut();
          onNotInvited(email);
          onLoadingChange?.(false);
          return;
        }
      }
      window.location.href = "/home";
    },
    [router, onError, onLoadingChange, onNotInvited]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") return;

    function init() {
      const g = (window as any).google;
      if (!g?.accounts?.id || !btnRef.current) return;
      g.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      g.accounts.id.renderButton(btnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: btnRef.current.offsetWidth || 380,
        logo_alignment: "left",
      });
    }

    if ((window as any).google?.accounts?.id) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.head.appendChild(script);
      return () => { document.head.removeChild(script); };
    }
  }, [handleCredential]);

  return <div ref={btnRef} className="w-full" style={{ minHeight: 44 }} />;
}
