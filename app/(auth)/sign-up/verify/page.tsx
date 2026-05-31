import Link from "next/link"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-sm text-center">

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--kk-green-soft)" }}>
          <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="var(--kk-green)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M2 8l10 6 10-6" />
          </svg>
        </div>

        <p className="serif font-bold tracking-tight mb-1" style={{ fontSize: "1.75rem", color: "var(--kk-ink)", letterSpacing: "-0.03em" }}>
          Check your email
        </p>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
          We&apos;ve sent you a confirmation link. Click it to activate your account and access kakisewa.
        </p>

        <div className="mt-6 rounded-2xl p-5 text-left space-y-2.5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
          <p className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>What to do next</p>
          {["Open the email from kakisewa", "Click the confirmation link", "You'll be taken straight to your dashboard"].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: "var(--kk-green-soft)", color: "var(--kk-green)" }}>{i + 1}</span>
              <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{step}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
          Didn&apos;t receive it? Check your spam folder, or{" "}
          <Link href="/sign-up" style={{ color: "var(--kk-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            try again
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
