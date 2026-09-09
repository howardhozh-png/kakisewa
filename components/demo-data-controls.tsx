"use client";

import { useState, useEffect } from "react";
import { Loader2, FlaskConical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DemoDataControls() {
  const router = useRouter();
  const [hasDemo, setHasDemo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/demo/status")
      .then((r) => r.json())
      .then((d) => setHasDemo(d.hasDemo))
      .catch(() => setHasDemo(false));
  }, []);

  if (hasDemo === null) return null;

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
      router.refresh();
      toast.success("Demo cards removed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-5 flex items-center gap-2 flex-wrap">
      {!hasDemo ? (
        <button
          onClick={populate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors"
          style={{
            color: "var(--kk-ink-mute)",
            borderColor: "var(--kk-line)",
            background: "var(--kk-surface)",
          }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FlaskConical className="w-3.5 h-3.5" />
          )}
          Populate demo data
        </button>
      ) : (
        <button
          onClick={clear}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors"
          style={{
            color: "var(--kk-red)",
            borderColor: "var(--kk-red)",
            background: "transparent",
          }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Remove all demo cards
        </button>
      )}
    </div>
  );
}
