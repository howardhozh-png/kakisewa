"use client";

import { useEffect } from "react";
import { applyTheme, getTheme } from "@/components/accent-provider";

export function ThemeReset() {
  useEffect(() => {
    applyTheme(getTheme("default"));
  }, []);
  return null;
}
