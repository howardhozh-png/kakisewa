"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthCodeRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");

  useEffect(() => {
    if (code) {
      router.replace(`/auth/callback?code=${code}&next=/reset-password`);
    }
  }, [code, router]);

  return null;
}
