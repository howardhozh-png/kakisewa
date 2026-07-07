"use client"

import { useRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface Props {
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  // "enter" (default): 8 separate boxes, reads as "type the code you were sent" —
  // correct for sign-in, where the user IS entering an existing code.
  // "create": a single password-style field with a show/hide toggle, reads as
  // "choose your own password" — used on sign-up, where the OTP-box look was
  // confusing first-time visitors into thinking they had to wait for a code.
  variant?: "enter" | "create"
}

export function PasscodeInput({ value, onChange, autoComplete = "current-password", required, variant = "enter" }: Props) {
  if (variant === "create") {
    return <CreatePasscodeField value={value} onChange={onChange} autoComplete={autoComplete} required={required} />
  }
  return <OtpPasscodeField value={value} onChange={onChange} autoComplete={autoComplete} required={required} />
}

function CreatePasscodeField({ value, onChange, autoComplete, required }: Omit<Props, "variant">) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        inputMode="numeric"
        maxLength={8}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        autoComplete={autoComplete}
        placeholder="Choose an 8-digit passcode"
        aria-label="Choose an 8-digit passcode"
        className="rounded-xl h-auto py-2.5 px-3.5"
        style={{
          width: "100%",
          fontSize: "var(--kk-body)",
          background: "var(--kk-bg)",
          color: "var(--kk-ink)",
          border: "1px solid var(--kk-line)",
          letterSpacing: value ? "0.2em" : "normal",
          paddingRight: 44,
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? "Hide passcode" : "Show passcode"}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", color: "var(--kk-ink-mute)", cursor: "pointer",
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function OtpPasscodeField({ value, onChange, autoComplete, required }: Omit<Props, "variant">) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const cursorPos = Math.min(value.length, 8)

  return (
    <div
      className="flex gap-1.5 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={8}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        autoComplete={autoComplete}
        onFocus={e => { setFocused(true); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" }) }}
        onBlur={() => setFocused(false)}
        className="sr-only"
        aria-label="8-digit passcode"
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const filled = i < value.length
        const isCursor = focused && i === cursorPos && cursorPos < 8
        return (
          <div
            key={i}
            className="flex-1 flex items-center justify-center rounded-xl"
            style={{
              height: 46,
              border: `1.5px solid ${isCursor ? "var(--ring)" : filled ? "var(--kk-line-strong)" : "var(--kk-line)"}`,
              background: "var(--kk-bg)",
              transition: "border-color 0.12s",
            }}
          >
            {filled ? (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--kk-ink)", display: "block" }} />
            ) : isCursor ? (
              <span
                className="animate-pulse"
                style={{ width: 2, height: 18, background: "var(--kk-ink-mute)", display: "block", borderRadius: 1 }}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
