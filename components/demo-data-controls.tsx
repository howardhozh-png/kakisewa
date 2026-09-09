"use client";

import { useState, useEffect } from "react";
import { Loader2, FlaskConical, Trash2, X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const DISMISSED_KEY = "kk_demo_helper_dismissed";

export function useDemoHelperVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(localStorage.getItem(DISMISSED_KEY) !== "1");
  }, []);
  return { visible, show: () => { localStorage.removeItem(DISMISSED_KEY); setVisible(true); } };
}

// Inline sidebar version — placed at the bottom of the sidebar nav
export function SidebarDemoHelper({ showLabels }: { showLabels: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [hasDemo, setHasDemo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    setVisible(true);
    fetch("/api/demo/status")
      .then((r) => r.json())
      .then((d) => setHasDemo(d.hasDemo))
      .catch(() => setHasDemo(false));
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function populate() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Could not add demo data");
        return;
      }
      setHasDemo(true);
      setDone(true);
      router.refresh();
      toast.success("Demo cards added across all boards");
    } finally {
      setLoading(false);
    }
  }

  async function clear() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/clear", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Could not remove demo data");
        return;
      }
      setHasDemo(false);
      setDone(false);
      router.refresh();
      toast.success("Demo cards removed");
    } finally {
      setLoading(false);
    }
  }

  if (!visible || hasDemo === null) return null;

  // Collapsed: just the flask icon (amber tint to stand out)
  if (!showLabels) {
    return (
      <button
        onClick={hasDemo ? clear : populate}
        disabled={loading}
        title={hasDemo ? "Remove demo cards" : "Populate demo data"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", padding: "9px 12px", border: "none",
          borderRadius: 8, cursor: "pointer",
          background: "transparent",
          color: hasDemo ? "#B45309" : "var(--kk-ink-faint)",
          transition: "background 0.1s",
        }}
      >
        {loading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <FlaskConical style={{ width: 18, height: 18 }} />}
      </button>
    );
  }

  // Expanded: amber card with action + dismiss
  return (
    <div
      style={{
        margin: "4px 8px",
        borderRadius: 10,
        padding: "10px 10px 10px 12px",
        background: "var(--kk-amber-soft)",
        border: "1px solid rgba(255,149,0,0.2)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Dismiss X */}
      <button
        onClick={dismiss}
        title="Dismiss"
        style={{
          position: "absolute", top: 6, right: 6,
          background: "none", border: "none", cursor: "pointer",
          color: "#B45309", opacity: 0.6, padding: 2, borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <X style={{ width: 12, height: 12 }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <FlaskConical style={{ width: 13, height: 13, color: "#B45309", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#B45309", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {hasDemo ? "Demo active" : "Try demo data"}
        </span>
        {done && <CheckCircle style={{ width: 12, height: 12, color: "#B45309", marginLeft: "auto" }} />}
      </div>

      <p style={{ fontSize: 11, color: "#92400E", lineHeight: 1.4, marginBottom: 8 }}>
        {hasDemo
          ? "10 sample cards spread across your boards."
          : "Populate sample cards across all your boards to explore the app."}
      </p>

      <button
        onClick={hasDemo ? clear : populate}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 6,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          background: hasDemo ? "rgba(180,83,9,0.12)" : "#B45309",
          color: hasDemo ? "#B45309" : "#fff",
          width: "100%",
          justifyContent: "center",
          transition: "opacity 0.1s",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
          : hasDemo
            ? <Trash2 style={{ width: 12, height: 12 }} />
            : <FlaskConical style={{ width: 12, height: 12 }} />}
        {hasDemo ? "Remove demo cards" : "Add demo cards"}
      </button>
    </div>
  );
}

// Settings page version — lets dismissed users re-enable the helper
export function DemoHelperSettingsRow() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (!dismissed) return null;

  function restore() {
    localStorage.removeItem(DISMISSED_KEY);
    setDismissed(false);
    toast.success("Demo helper restored in the sidebar");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--kk-ink)" }}>Demo data helper</p>
        <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", marginTop: 2 }}>
          Show the demo cards helper in the sidebar to explore the app with sample data.
        </p>
      </div>
      <button
        onClick={restore}
        style={{
          fontSize: 12, fontWeight: 600, padding: "6px 14px",
          borderRadius: 8, border: "1px solid var(--kk-line)",
          background: "var(--kk-surface)", color: "var(--kk-ink-mute)",
          cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        Restore
      </button>
    </div>
  );
}
