"use client"

import { useRef, useState } from "react"

interface Props {
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}

export function PasscodeInput({ value, onChange, autoComplete = "current-password", required }: Props) {
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
