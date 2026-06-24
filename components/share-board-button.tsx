"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Share2, Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react";
import { upsertBoardShare, regenerateBoardLink } from "@/lib/actions";
import { toast } from "sonner";

interface Props {
  initialSlug: string | null;
  initialPasscode: string | null;
}

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://kakisewa.com";

export function ShareBoardButton({ initialSlug, initialPasscode }: Props) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [passcode, setPasscode] = useState(initialPasscode ?? "");
  const [digits, setDigits] = useState<string[]>(
    initialPasscode ? initialPasscode.split("") : Array(8).fill("")
  );
  const [showPasscode, setShowPasscode] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isActive = !!slug && !!passcode;
  const boardUrl = slug ? `${ORIGIN}/mypipeline/${slug}` : null;
  const currentPasscode = digits.join("");
  const isPasscodeComplete = /^\d{8}$/.test(currentPasscode);

  function handleDigitKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits]; next[i] = "";
        setDigits(next);
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
      }
    }
  }

  function handleDigitChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = digit;
    setDigits(next);
    if (digit && i < 7) inputRefs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (!text) return;
    e.preventDefault();
    const next = Array(8).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputRefs.current[Math.min(text.length, 7)]?.focus();
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await upsertBoardShare(currentPasscode);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setSlug(result.slug);
        setPasscode(currentPasscode);
        toast.success("Share link created");
      }
    });
  }

  function handleSavePasscode() {
    startTransition(async () => {
      const result = await upsertBoardShare(currentPasscode);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setSlug(result.slug);
        setPasscode(currentPasscode);
        toast.success("Passcode updated — previous sessions expired");
      }
    });
  }

  function handleRegenerate() {
    setIsRegenerating(true);
    startTransition(async () => {
      const result = await regenerateBoardLink();
      setIsRegenerating(false);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setSlug(result.slug);
        toast.success("New link generated — old link no longer works");
      }
    });
  }

  function copyLink() {
    if (!boardUrl) return;
    navigator.clipboard.writeText(boardUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const passcodeChanged = isActive && currentPasscode !== passcode;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 12,
          border: "1.5px solid var(--kk-line, #E5E5EA)",
          background: "var(--kk-surface, #fff)",
          color: "var(--kk-ink, #1D1D1F)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        <Share2 size={14} />
        Share board
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, padding: "28px 28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            {/* X close */}
            <button
              onClick={() => setOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", border: "none", background: "#F2F2F7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E6E73" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>

            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Share your board</div>
            <div style={{ fontSize: 13, color: "#6E6E73", marginBottom: 24, lineHeight: 1.5 }}>
              Give your team lead a private link to view all your listed properties.
            </div>

            {/* Passcode section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8E8E93", marginBottom: 10 }}>
                {isActive ? "Passcode" : "Set a passcode"}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }} onPaste={handlePaste}>
                {Array(8).fill(0).map((_, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type={showPasscode ? "tel" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKey(i, e)}
                    onFocus={e => e.target.select()}
                    style={{
                      width: "100%", height: 42, textAlign: "center", fontSize: 18, fontWeight: 700,
                      border: `1.5px solid ${digits[i] ? "#0071E3" : "#E5E5EA"}`,
                      borderRadius: 10, background: digits[i] ? "#fff" : "#F9F9FB",
                      color: "#1D1D1F", outline: "none", caretColor: "transparent",
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowPasscode(v => !v)}
                  style={{ flexShrink: 0, width: 42, height: 42, border: "1.5px solid #E5E5EA", borderRadius: 10, background: "#F9F9FB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E6E73" }}
                >
                  {showPasscode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#8E8E93" }}>8 digits only. Share this with your team lead separately.</div>
            </div>

            {/* Not yet set up */}
            {!isActive && (
              <button
                onClick={handleGenerate}
                disabled={!isPasscodeComplete || isPending}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14,
                  background: isPasscodeComplete ? "#0071E3" : "#E5E5EA",
                  color: isPasscodeComplete ? "#fff" : "#8E8E93",
                  fontSize: 15, fontWeight: 600, border: "none",
                  cursor: isPasscodeComplete ? "pointer" : "default",
                }}
              >
                {isPending ? "Generating…" : "Generate link"}
              </button>
            )}

            {/* Active state */}
            {isActive && (
              <>
                {/* Link row */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8E8E93", marginBottom: 8 }}>Share link</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F9F9FB", border: "1px solid #E5E5EA", borderRadius: 12, padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: "#1D1D1F", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{boardUrl}</span>
                    <button
                      onClick={copyLink}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: linkCopied ? "rgba(52,199,89,0.12)" : "rgba(0,113,227,0.10)", color: linkCopied ? "#1F8B4C" : "#0071E3", transition: "all 0.15s" }}
                    >
                      {linkCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* Save passcode (if changed) */}
                {passcodeChanged && isPasscodeComplete && (
                  <button
                    onClick={handleSavePasscode}
                    disabled={isPending}
                    style={{ width: "100%", padding: "12px", borderRadius: 12, background: "#0071E3", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", marginBottom: 12 }}
                  >
                    {isPending ? "Saving…" : "Save new passcode"}
                  </button>
                )}

                {/* Regenerate link */}
                <button
                  onClick={handleRegenerate}
                  disabled={isPending || isRegenerating}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: "transparent", color: "#8E8E93", fontSize: 13, fontWeight: 500, border: "1px solid #E5E5EA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <RefreshCw size={13} />
                  {isRegenerating ? "Regenerating…" : "Regenerate link (old link stops working)"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
