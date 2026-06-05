"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { CalendarDays, Send, CheckCircle, Camera, X as XIcon, Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { UploadRing } from "@/components/ui/upload-ring";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";

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
  agentPhotoUrl?: string | null;
  greeting: string;
  questions: IntakeQuestion[];
  onComplete: (answers: Record<string, string>) => Promise<{ ok: boolean; message?: string }>;
  thankYouMessage?: string;
}

const CHAT_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const C = {
  bg: "#F2F2F7",
  header: "#fff",
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
  agentPhotoUrl,
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
  const [bottomOffset, setBottomOffset] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep layout above keyboard on iOS: track keyboard height via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      const offset = window.innerHeight - vv!.offsetTop - vv!.height;
      setBottomOffset(Math.max(0, offset));
    }
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

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
    <div
      className="flex flex-col overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: bottomOffset, background: C.bg }}
    >
      {/* Header — no fontFamily override so Logo serif renders correctly */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: C.header, borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* kakisewa wordmark — first thing owner sees, uses .serif class correctly */}
        <div className="shrink-0" style={{ color: C.ink }}>
          <Logo variant="wordmark" size={24} />
        </div>
        {/* Divider */}
        <div className="w-px h-7 shrink-0" style={{ background: "rgba(0,0,0,0.10)" }} />
        {/* Agent avatar + name */}
        {agentPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agentPhotoUrl}
            alt={agentName}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0"
            style={{ background: C.avatar, fontFamily: CHAT_FONT }}
          >
            {agentInitial}
          </div>
        )}
        <div className="min-w-0" style={{ fontFamily: CHAT_FONT }}>
          <p className="font-semibold text-[14px] leading-tight truncate" style={{ color: C.ink }}>{agentName}</p>
          <p className="text-[11px] leading-tight truncate" style={{ color: C.muted }}>{agentAgency}</p>
        </div>
      </div>

      {/* Chat bubbles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ fontFamily: CHAT_FONT }}>
        {/* Trust banner */}
        <TrustBanner />
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
            {/* Trusted badge */}
            <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", maxWidth: 320 }}>
              <div className="flex -space-x-2 shrink-0">
                {["#1C1C1E","#3A3A3C","#48484A","#636366"].map((bg,i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
                    style={{ background: bg, color: "#fff", zIndex: 4 - i }}>
                    {["HC","LM","RN","KS"][i]}
                  </div>
                ))}
              </div>
              <p className="text-[12px] font-semibold" style={{ color: "#1C1C1E" }}>
                Trusted by 80,000+ agents on kakisewa
              </p>
            </div>
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

function TrustBanner() {
  const today = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div
      className="flex items-start gap-2 mx-auto max-w-xs px-4 py-2.5 rounded-xl text-center"
      style={{ background: "rgba(0,0,0,0.05)", fontFamily: CHAT_FONT }}
    >
      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: C.muted }} />
      <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>
        This form is private and secure. Only you and your agent can see your responses. · {today}
      </p>
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5 - photos.length);
    if (!list.length) return;
    setUploadProgress(0);
    const added: { url: string; preview: string }[] = [];
    for (let i = 0; i < list.length; i++) {
      const preview = URL.createObjectURL(list[i]);
      const compressed = await compressImage(list[i]);
      const form = new FormData();
      form.append("token", uploadToken);
      form.append("file", compressed);
      const { ok, data } = await uploadWithProgress("/api/intake/photo", form, (pct) => {
        setUploadProgress(Math.round((i * 100 + pct) / list.length));
      });
      if (ok && data.url) added.push({ url: data.url as string, preview });
    }
    setUploadProgress(null);
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
            disabled={uploadProgress !== null}
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-opacity disabled:opacity-50"
            style={{ background: "#F2F2F7", border: "2px dashed #C7C7CC" }}
          >
            {uploadProgress !== null ? (
              <UploadRing progress={uploadProgress} size={32} />
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
        disabled={!canSubmit || uploadProgress !== null}
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
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  }, []);

  const displayDate = value
    ? (() => {
        try {
          const [y, m, d] = value.split("-").map(Number);
          return `${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1]} ${y}`;
        } catch { return value; }
      })()
    : "";

  return (
    <div className="mt-3 mx-auto w-full max-w-[300px] rounded-2xl overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <CalendarDays className="w-5 h-5" style={{ color: "#48484A" }} />
        <span className="text-[14px] font-semibold" style={{ color: "#1C1C1E" }}>Select move-in date</span>
      </div>
      <div className="px-4 pb-3">
        {/* Tap target — native date input is a transparent overlay so iOS opens picker directly */}
        <div
          className="relative flex items-center justify-between w-full px-4 py-3 rounded-xl"
          style={{ background: "#F2F2F7", border: value ? "1.5px solid #1C1C1E" : "1.5px solid #C7C7CC" }}
        >
          <span className="text-[15px] pointer-events-none" style={{ color: value ? "#1C1C1E" : "#AEAEB2" }}>
            {displayDate || "Tap to choose date"}
          </span>
          <CalendarDays className="w-4 h-4 pointer-events-none" style={{ color: "#8E8E93" }} />
          {/* Transparent native input covers the entire tap target */}
          <input
            ref={inputRef}
            id="intake-date"
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
              border: "none",
              padding: 0,
              margin: 0,
            }}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!value}
        onClick={() => value && onConfirm(value)}
        className="w-full py-3.5 text-[14px] font-semibold"
        style={{ background: value ? "#1C1C1E" : "#AEAEB2", color: "#fff" }}
      >
        {value ? `Confirm: ${displayDate}` : "Pick a date above"}
      </button>
    </div>
  );
}
