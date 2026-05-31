"use client";

import { useEffect } from "react";

export type Theme = {
  key: string;
  name: string;
  preview: string;           // swatch dot color
  bg: string;                // --kk-bg (page background, lightest)
  topnavBg: string;          // --kk-topnav-bg
  barBg: string;             // --kk-bar-bg (greeting bar, between bg and topnav)
  accent: string;            // --kk-accent (buttons, identity)
  topnavInk?: string;        // white for dark navbars, omit for dark-on-light
  topnavMute?: string;
  topnavActive?: string;
  barInk?: string;           // white for dark greeting bars
  barMute?: string;
};

export const THEMES: Theme[] = [
  {
    key: "default",
    name: "Default",
    preview: "#E5E5EA",
    bg: "#FBFBFD",
    topnavBg: "#FFFFFF",
    barBg: "#F5F5F7",
    accent: "#1D1D1F",
  },
  {
    key: "navy_blue",
    name: "Navy",
    preview: "#1A5294",
    bg: "#F0F4F8",
    topnavBg: "#001F3F",
    barBg: "#6A9BD1",
    accent: "#004B87",
    topnavInk: "#FFFFFF",
    topnavMute: "rgba(255,255,255,0.60)",
    topnavActive: "#FFFFFF",
    barInk: "#FFFFFF",
    barMute: "rgba(255,255,255,0.75)",
  },
  {
    key: "autumn_red",
    name: "Autumn",
    preview: "#A74949",
    bg: "#FDF0EC",
    topnavBg: "#8B3D3D",
    barBg: "#F9D5C5",
    accent: "#8B3D3D",
    topnavInk: "#FFFFFF",
    topnavMute: "rgba(255,255,255,0.65)",
    topnavActive: "#FFFFFF",
  },
  {
    key: "matcha",
    name: "Matcha",
    preview: "#4A7C59",
    bg: "#F0F5F0",
    topnavBg: "#2D6A4F",
    barBg: "#C5DCC9",
    accent: "#2D6A4F",
    topnavInk: "#FFFFFF",
    topnavMute: "rgba(255,255,255,0.65)",
    topnavActive: "#FFFFFF",
  },
];

export function getTheme(key?: string | null): Theme {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}

function applyTheme(t: Theme) {
  const r = document.documentElement;
  r.style.setProperty("--kk-bg", t.bg);
  r.style.setProperty("--kk-topnav-bg", t.topnavBg);
  r.style.setProperty("--kk-bar-bg", t.barBg);
  r.style.setProperty("--kk-accent", t.accent);
  r.style.setProperty("--kk-topnav-ink", t.topnavInk ?? "var(--kk-ink)");
  r.style.setProperty("--kk-topnav-mute", t.topnavMute ?? "var(--kk-ink-mute)");
  r.style.setProperty("--kk-topnav-active", t.topnavActive ?? t.accent);
  r.style.setProperty("--kk-bar-ink", t.barInk ?? "var(--kk-ink)");
  r.style.setProperty("--kk-bar-mute", t.barMute ?? "var(--kk-ink-mute)");
}

export function AccentProvider({ color }: { color?: string | null }) {
  useEffect(() => {
    applyTheme(getTheme(color));
  }, [color]);

  return null;
}
