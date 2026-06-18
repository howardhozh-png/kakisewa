"use client";

import { useState, useRef } from "react";
import { MessageSquarePlus, X, Loader2, Check } from "lucide-react";

type Category = "bug" | "suggestion" | "question";

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: "bug",        label: "Bug",        emoji: "🐛" },
  { value: "suggestion", label: "Suggestion", emoji: "💡" },
  { value: "question",   label: "Question",   emoji: "❓" },
];

export function FeedbackButton() {
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    setOpen(true);
    setDone(false);
    setMessage("");
    setCategory("bug");
    setTimeout(() => textRef.current?.focus(), 80);
  }

  async function handleSubmit() {
    if (!message.trim() || loading) return;
    setLoading(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message, pageUrl: window.location.pathname }),
    });
    setLoading(false);
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); }, 2200);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 lg:bottom-5 lg:right-5 z-40 flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: "var(--kk-ink)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        }}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5 pb-20"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--kk-line)" }}>
              <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>Send feedback</p>
              <button onClick={() => setOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" style={{ color: "var(--kk-ink)" }} />
              </button>
            </div>

            {done ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--kk-green-soft)" }}>
                  <Check className="w-5 h-5" style={{ color: "var(--kk-green)" }} />
                </div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>Got it, thanks!</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>We read every submission.</p>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                {/* Category chips */}
                <div className="flex gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: category === c.value ? "var(--kk-ink)" : "var(--kk-surface-2)",
                        color: category === c.value ? "#fff" : "var(--kk-ink-mute)",
                        border: `1px solid ${category === c.value ? "transparent" : "var(--kk-line)"}`,
                      }}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  ref={textRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === "bug"        ? "What happened? What did you expect?" :
                    category === "suggestion" ? "What would make kakisewa better for you?" :
                    "What do you need help with?"
                  }
                  rows={4}
                  className="w-full rounded-xl p-3 text-[13px] leading-relaxed resize-none focus:outline-none"
                  style={{
                    background: "var(--kk-surface-2)",
                    border: "1px solid var(--kk-line)",
                    color: "var(--kk-ink)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                  }}
                />

                <div className="flex items-center justify-between">
                  <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>⌘↵ to send</p>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-85"
                    style={{
                      background: message.trim() ? "var(--kk-ink)" : "var(--kk-surface-2)",
                      color: message.trim() ? "#fff" : "var(--kk-ink-faint)",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {loading ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
