"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ExternalLink } from "lucide-react";
import Link from "next/link";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );
}

function renderMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let listType: "ol" | "ul" | null = null;
  let listItems: React.ReactNode[] = [];
  let k = 0;

  function flushList() {
    if (!listItems.length) return;
    nodes.push(
      listType === "ol"
        ? <ol key={k++} style={{ margin: "6px 0", paddingLeft: 20, listStyleType: "decimal", listStylePosition: "outside", lineHeight: 1.6 }}>{listItems}</ol>
        : <ul key={k++} style={{ margin: "6px 0", paddingLeft: 20, listStyleType: "disc", listStylePosition: "outside", lineHeight: 1.6 }}>{listItems}</ul>
    );
    listItems = [];
    listType = null;
  }

  for (const line of lines) {
    const ol = line.match(/^(\d+)\.\s+(.+)/);
    const ul = line.match(/^[-*]\s+(.+)/);
    if (ol) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(<li key={listItems.length} style={{ marginBottom: 2 }}>{renderInline(ol[2])}</li>);
    } else if (ul) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(<li key={listItems.length} style={{ marginBottom: 2 }}>{renderInline(ul[1])}</li>);
    } else {
      flushList();
      if (line.trim()) nodes.push(<p key={k++} style={{ margin: "2px 0" }}>{renderInline(line)}</p>);
    }
  }
  flushList();
  return nodes;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "kk-chat-v1";
const MAX_STORED = 20;

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

export function FaqChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMessages(loadMessages());
    }
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
      } catch {}
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), 50);
      if (!isMobile) setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-6) }),
      });
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not connect. Please email support@kakisewa.com." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 132,
        left: 8,
        right: 8,
        maxHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--kk-surface)",
        borderRadius: 18,
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        zIndex: 9998,
        overflow: "hidden",
        border: "1px solid var(--kk-line)",
      }
    : {
        position: "fixed",
        bottom: 132,
        right: 20,
        width: 360,
        height: 480,
        display: "flex",
        flexDirection: "column",
        background: "var(--kk-surface)",
        borderRadius: 18,
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        zIndex: 9998,
        overflow: "hidden",
        border: "1px solid var(--kk-line)",
      };

  return (
    <>
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--kk-line)",
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--kk-ink)", margin: 0 }}>
                kakisewa Help
              </p>
              <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0 }}>
                Ask anything or{" "}
                <Link
                  href="/faq"
                  onClick={() => setOpen(false)}
                  style={{ color: "var(--kk-blue)", textDecoration: "none", fontWeight: 500 }}
                >
                  browse the FAQ
                </Link>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Link
                href="/faq"
                onClick={() => setOpen(false)}
                title="Open full FAQ"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  color: "var(--kk-ink-mute)",
                  background: "none",
                  border: "none",
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={14} />
              </Link>
              <button
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--kk-ink-mute)",
                }}
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", marginBottom: 12 }}>
                  Hi! Ask me anything about using kakisewa.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "How do I send a property pack?",
                    "How do I enable push notifications on iPhone?",
                    "How does Existing listing renewal work?",
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => { setInput(hint); setTimeout(() => inputRef.current?.focus(), 30); }}
                      style={{
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 20,
                        background: "var(--kk-surface-2)",
                        border: "1px solid var(--kk-line)",
                        color: "var(--kk-ink-mute)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "8px 12px",
                    borderRadius:
                      m.role === "user"
                        ? "14px 14px 4px 14px"
                        : "4px 14px 14px 14px",
                    background:
                      m.role === "user" ? "var(--kk-blue)" : "var(--kk-surface-2)",
                    color: m.role === "user" ? "#fff" : "var(--kk-ink)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    wordBreak: "break-word",
                  }}
                >
                  {m.role === "assistant" ? renderMessage(m.content) : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: "4px 14px 14px 14px",
                    background: "var(--kk-surface-2)",
                    color: "var(--kk-ink-faint)",
                    fontSize: 13,
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--kk-line)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              background: "var(--kk-surface)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                background: "var(--kk-surface-2)",
                border: "1px solid var(--kk-line)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--kk-ink)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                background: "var(--kk-blue)",
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: !input.trim() || loading ? 0.4 : 1,
                flexShrink: 0,
                transition: "opacity 0.15s",
              }}
              aria-label="Send"
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* Orbit animation keyframes */}
      <style>{`
        @keyframes kk-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes kk-counter { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(-360deg); } }
      `}</style>

      {/* Orbiting "Ask me" label — only when closed */}
      {!open && (
        <div style={{ position: "fixed", bottom: 72, right: 20, width: 48, height: 48, pointerEvents: "none", zIndex: 9998 }}>
          <div style={{ position: "absolute", inset: -26, animation: "kk-orbit 7s linear infinite" }}>
            <span style={{
              position: "absolute",
              top: 0,
              left: "50%",
              animation: "kk-counter 7s linear infinite",
              fontSize: 10,
              fontWeight: 700,
              color: "#0071E3",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              background: "#fff",
              padding: "2px 7px",
              borderRadius: 20,
              boxShadow: "0 1px 6px rgba(0,113,227,0.2)",
              border: "1px solid rgba(0,113,227,0.18)",
            }}>Ask me</span>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 72,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--kk-blue)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 18px rgba(0, 113, 227, 0.45)",
          zIndex: 9999,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        aria-label={open ? "Close help chat" : "Open help chat"}
      >
        {open ? <X size={20} color="#fff" /> : <MessageCircle size={20} color="#fff" />}
      </button>
    </>
  );
}
