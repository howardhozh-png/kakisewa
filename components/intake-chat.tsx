"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { CalendarDays, Send, CheckCircle, Camera, X as XIcon } from "lucide-react";
import { Logo } from "@/components/logo";

export interface IntakeQuestion {
  key: string;
  text: string;
  inputType?: "text" | "number" | "tel" | "date" | "choice" | "rent" | "photo";
  choices?: string[];
  placeholder?: string;
  optional?: boolean;
  uploadToken?: string;
}

interface Props {
  agentName: string;
  agentAgency: string;
  agentInitial: string;
  greeting: string;
  questions: IntakeQuestion[];
  onComplete: (answers: Record<string, string>) => Promise<{ ok: boolean; message?: string }>;
  thankYouMessage?: string;
}

const CHAT_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const C = {
  bg: "#F2F2F7",
  header: "#1C1C1E",
  avatar: "#48484A",
  ink: "#1C1C1E",
  muted: "#6C6C70",
  accent: "#1C1C1E",
  accentDisabled: "#AEAEB2",
  choiceBorder: "#C7C7CC",
} as const;

export function IntakeChat({
  agentName,
  agentAgency,
  agentInitial,
  greeting,
  questions,
  onComplete,
  thankYouMessage = "Thank you! We'll be in touch soon.",
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"active" | "submitting" | "done" | "error">("active");
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentIdx, answers, status]);

  useEffect(() => {
    const t = setTimeout(() => setCurrentIdx(0), 700);
    return () => clearTimeout(t);
  }, []);

  const currentQ = questions[currentIdx];

  async function handleAnswer(value: string) {
    if (!currentQ) return;
    const trimmed = value.trim();
    if (!trimmed && !currentQ.optional) return;

    const newAnswers = { ...answers, [currentQ.key]: trimmed };
    setAnswers(newAnswers);
    setInputValue("");

    if (currentIdx + 1 < questions.length) {
      setTimeout(() => setCurrentIdx(currentIdx + 1), 500);
    } else {
      setStatus("submitting");
      try {
        const res = await onComplete(newAnswers);
        if (res.ok) {
          setStatus("done");
        } else {
          setStatus("error");
          setErrorMsg(res.message ?? "Something went wrong. Please try again.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Network error. Please try again.");
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleAnswer(inputValue);
  }

  return (
    // No fontFamily here — keeps Logo's .serif class intact
    <div className="flex flex-col h-dvh max-h-dvh" style={{ background: C.bg }}>
      {/* Header — no fontFamily override so Logo serif renders correctly */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: C.header, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
      >
        {/* kakisewa wordmark — first thing owner sees, uses .serif class correctly */}
        <div className="shrink-0" style={{ color: "rgba(255,255,255,0.92)" }}>
          <Logo variant="wordmark" size={24} />
        </div>
        {/* Divider */}
        <div className="w-px h-7 shrink-0" style={{ background: "rgba(255,255,255,0.18)" }} />
        {/* Agent avatar + name */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0"
          style={{ background: C.avatar, fontFamily: CHAT_FONT }}
        >
          {agentInitial}
        </div>
        <div className="min-w-0" style={{ fontFamily: CHAT_FONT }}>
          <p className="text-white font-semibold text-[14px] leading-tight truncate">{agentName}</p>
          <p className="text-[11px] leading-tight truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{agentAgency}</p>
        </div>
      </div>

      {/* Chat bubbles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ fontFamily: CHAT_FONT }}>
        <AgentBubble text={greeting} />

        {questions.slice(0, currentIdx + 1).map((q, i) => (
          <div key={q.key}>
            <AgentBubble text={q.text} delayed={i === 0} />
            {answers[q.key] !== undefined ? (
              <UserBubble text={q.key === "expected_rent" ? `RM ${Number(answers[q.key]).toLocaleString()}` : (answers[q.key] || "(skipped)")} />
            ) : q.inputType === "choice" && q.choices && i === currentIdx && status === "active" ? (
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {q.choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAnswer(c)}
                    className="px-4 py-2 rounded-full font-medium text-[14px] transition-colors active:bg-gray-100"
                    style={{ background: "#fff", border: `1.5px solid ${C.choiceBorder}`, color: C.ink }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : q.inputType === "date" && i === currentIdx && status === "active" ? (
              <DatePickerCard onConfirm={(iso) => handleAnswer(iso)} />
            ) : q.inputType === "photo" && i === currentIdx && status === "active" ? (
              <PhotoUploadCard
                uploadToken={q.uploadToken ?? ""}
                optional={q.optional}
                onConfirm={(urls) => handleAnswer(urls.join(","))}
              />
            ) : null}
          </div>
        ))}

        {status === "submitting" && <AgentBubble text="Sending your details…" />}
        {status === "done" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.accent }}>
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <AgentBubble text={thankYouMessage} />
          </div>
        )}
        {status === "error" && <AgentBubble text={`⚠️ ${errorMsg}`} />}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {status === "active" && currentIdx >= 0 && !answers[currentQ?.key ?? ""] && currentQ?.inputType !== "choice" && currentQ?.inputType !== "date" && currentQ?.inputType !== "photo" && (
        <div
          className="shrink-0 px-3 py-3 flex items-end gap-2"
          style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)", fontFamily: CHAT_FONT }}
        >
          <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full">
            <input
              type={currentQ?.inputType === "rent" ? "number" : (currentQ?.inputType ?? "text")}
              inputMode={currentQ?.inputType === "rent" ? "decimal" : undefined}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentQ?.inputType === "rent" ? "e.g. 2500" : (currentQ?.placeholder ?? "Type a reply…")}
              autoFocus
              className="flex-1 rounded-full px-4 py-2.5 text-[15px] outline-none"
              style={{ background: C.bg, border: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.10)", color: C.ink }}
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: C.accent }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function AgentBubble({ text, delayed }: { text: string; delayed?: boolean }) {
  const [visible, setVisible] = useState(!delayed);
  useEffect(() => {
    if (delayed) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [delayed]);

  if (!visible) return null;
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[80%] px-3 py-2 rounded-tr-2xl rounded-b-2xl text-[14px] leading-snug"
        style={{ background: "#fff", color: "#111", boxShadow: "0 1px 1px rgba(0,0,0,0.08)" }}
      >
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] px-3 py-2 rounded-tl-2xl rounded-b-2xl text-[14px] leading-snug"
        style={{ background: "#E5E5EA", color: "#111", boxShadow: "0 1px 1px rgba(0,0,0,0.06)" }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

function PhotoUploadCard({
  uploadToken,
  optional,
  onConfirm,
}: {
  uploadToken: string;
  optional?: boolean;
  onConfirm: (urls: string[]) => void;
}) {
  const [photos, setPhotos] = useState<{ url: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: { url: string; preview: string }[] = [];
    for (const file of Array.from(files)) {
      if (photos.length + added.length >= 5) break;
      const preview = URL.createObjectURL(file);
      const form = new FormData();
      form.append("token", uploadToken);
      form.append("file", file);
      const res = await fetch("/api/intake/photo", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        added.push({ url: data.url as string, preview });
      }
    }
    setUploading(false);
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = optional || photos.length > 0;

  return (
    <div
      className="mt-3 mx-auto w-full max-w-[320px] rounded-2xl overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.10)" }}
    >
      <div className="px-5 pt-5 pb-3">
        <p className="text-[13px] font-semibold" style={{ color: "#1C1C1E" }}>
          Upload property photos
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "#6C6C70" }}>
          2–5 photos helps tenants decide faster
        </p>
      </div>

      {/* Thumbnails + add button */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <XIcon className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}

        {photos.length < 5 && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-opacity disabled:opacity-50"
            style={{ background: "#F2F2F7", border: "2px dashed #C7C7CC" }}
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-[#1C1C1E] border-t-transparent animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" style={{ color: "#48484A" }} />
                <span className="text-[9px] font-medium" style={{ color: "#6C6C70" }}>Add</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={!canSubmit || uploading}
        onClick={() => onConfirm(photos.map((p) => p.url))}
        className="w-full py-3.5 text-[14px] font-semibold transition-colors disabled:opacity-50"
        style={{ background: canSubmit ? "#1C1C1E" : "#AEAEB2", color: "#fff" }}
      >
        {photos.length > 0 ? `Continue with ${photos.length} photo${photos.length > 1 ? "s" : ""}` : optional ? "Skip" : "Upload at least 1 photo"}
      </button>
    </div>
  );
}

// ─── Date picker ──────────────────────────────────────────────────────────────

function DatePickerCard({ onConfirm }: { onConfirm: (iso: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try { inputRef.current?.showPicker?.(); } catch { /* not supported */ }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const displayDate = value ? value.split("-").reverse().join("/") : "";

  return (
    <div className="mt-3 mx-auto w-full max-w-[280px] rounded-2xl overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.10)" }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <CalendarDays className="w-5 h-5" style={{ color: "#48484A" }} />
        <span className="text-[13px] font-semibold" style={{ color: "#1C1C1E" }}>Select move-in date</span>
      </div>
      <div className="px-4 pb-2">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-[15px] px-3 py-2.5 rounded-xl outline-none"
          style={{ background: "#F2F2F7", border: "none", color: "#111" }}
        />
        {displayDate && (
          <p className="text-[12px] mt-1 text-center" style={{ color: "#48484A" }}>
            {displayDate}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!value}
        onClick={() => value && onConfirm(value)}
        className="w-full py-3 text-[14px] font-semibold transition-opacity"
        style={{ background: value ? "#1C1C1E" : "#AEAEB2", color: "#fff" }}
      >
        {value ? `Confirm: ${displayDate}` : "Pick a date above"}
      </button>
    </div>
  );
}
