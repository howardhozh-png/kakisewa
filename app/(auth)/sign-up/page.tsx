import Link from "next/link";
import { AuroraBg } from "@/components/aurora-bg";
import { HeroShapes } from "@/components/hero-shapes";

export default function SignUpPage() {
  return (
    <div className="relative min-h-dvh flex items-center justify-center px-6">
      <AuroraBg />
      <HeroShapes />

      <div
        className="relative z-10 w-full max-w-sm rounded-3xl p-8"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div className="mb-8 text-center">
          <p className="text-white font-bold text-[22px] tracking-tight">kakisewa</p>
          <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Create your agent account
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Full name
            </label>
            <input
              type="text"
              placeholder="Ahmad Firdaus"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-[15px] hover:opacity-90 transition-opacity"
            style={{ background: "#22c55e", color: "#fff" }}
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            Sign in →
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          RM 499/month · Cancel anytime
        </p>
      </div>
    </div>
  );
}
