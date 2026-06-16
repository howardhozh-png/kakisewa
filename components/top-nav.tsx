"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useTransition } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { CreditCard, HelpCircle, LogOut, User, ChevronDown, X, Check, Loader2, MessageCircle, Camera, Menu, Compass, ShieldCheck } from "lucide-react";
import { TOUR_EVENT } from "@/components/spotlight-tour";
import { DEMO_EVENT } from "@/components/onboarding-demo-dialog";
import { THEMES, getTheme, applyTheme, type Theme } from "@/components/accent-provider";
import { AgentProfile } from "@/lib/types";
import { saveProfileDetails } from "@/lib/actions";
import { PhotoCropDialog } from "@/components/photo-crop-dialog";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notification-bell";

const NAV = [
  { href: "/home",               label: "Home",               matchPaths: ["/home"],                                                      tourId: "tour-nav-home",        minPlan: null },
  { href: "/potential-listing",     label: "Outreach",           matchPaths: ["/potential-listing", "/my-listing", "/lost-listing", "/new-owners", "/leads"], tourId: "tour-nav-new-owners",  minPlan: null },
  { href: "/existing-listing",      label: "Existing listing",      matchPaths: ["/existing-listing", "/existing-contracts", "/tenancies"],        tourId: "tour-nav-contracts",   minPlan: null },
  { href: "/directory",          label: "Directory",          matchPaths: ["/directory", "/network", "/database", "/supports", "/tenants"],tourId: "tour-nav-directory",   minPlan: "platinum" as const },
  { href: "/performance",        label: "Performance",        matchPaths: ["/performance"],                                               tourId: "tour-nav-performance", minPlan: "elite" as const },
];

const PLAN_RANK: Record<string, number> = { silver: 1, gold: 2, platinum: 3, elite: 4 };

function navHasAccess(
  minPlan: "platinum" | "elite" | null,
  plan: string | null | undefined,
  status: string | null | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin || !minPlan) return true;
  if (status === "beta" || status === "trial") return true;
  if (!plan) return false;
  return (PLAN_RANK[plan] ?? 0) >= PLAN_RANK[minPlan];
}

function initials(name?: string | null): string {
  if (!name) return "KK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Modal overlay wrapper ─────────────────────────────────────────────────────
function Modal({ onClose, children, wide }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxWidth: wide ? 780 : 520, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--kk-line)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Account settings modal ────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--kk-surface-2)",
  border: "1px solid var(--kk-line)",
  borderRadius: 10,
  padding: "9px 13px",
  fontSize: 14,
  color: "var(--kk-ink)",
  outline: "none",
};

function AvatarCircle({ src, name, size = 64 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "var(--kk-accent)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.34, fontWeight: 700,
      }}
    >
      {initials(name)}
    </div>
  );
}

function splitName(full?: string | null): [string, string] {
  if (!full) return ["", ""];
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function AccountModal({ agent, onClose }: { agent: AgentProfile; onClose: () => void }) {
  const [firstName, lastName] = splitName(agent.name);
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [agency, setAgency] = useState(agent.agency ?? "");
  const [ren, setRen] = useState(agent.ren_number ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = [first.trim(), last.trim()].filter(Boolean).join(" ");

  const dirty =
    fullName !== (agent.name ?? "") ||
    phone !== (agent.phone ?? "") ||
    agency !== (agent.agency ?? "") ||
    ren !== (agent.ren_number ?? "") ||
    avatarBlob !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCropSrc(URL.createObjectURL(f));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCropDone(blob: Blob) {
    URL.revokeObjectURL(cropSrc!);
    setCropSrc(null);
    setAvatarBlob(blob);
    setAvatarPreview(URL.createObjectURL(blob));
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropSrc!);
    setCropSrc(null);
  }

  function handleSave() {
    startTransition(async () => {
      let photo_url = agent.photo_url;

      if (avatarBlob) {
        const form = new FormData();
        form.append("file", new File([avatarBlob], "avatar.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
        if (!res.ok) { toast.error("Avatar upload failed"); return; }
        const data = await res.json();
        photo_url = data.url;
      }

      const res = await saveProfileDetails({
        name: fullName,
        phone: phone.trim(),
        agency: agency.trim(),
        ren_number: ren.trim() || null,
        photo_url,
      });
      if (res.ok) { toast.success("Profile saved"); onClose(); }
      else toast.error("Failed to save");
    });
  }

  const displaySrc = avatarPreview ?? agent.photo_url;

  return (
    <>
      {cropSrc && (
        <PhotoCropDialog
          src={cropSrc}
          aspectRatio={1}
          shape="circle"
          onDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--kk-line)" }}>
        <p className="kk-overline mb-0.5">Settings</p>
        <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Account settings</p>
      </div>
      <div className="px-6 py-5 space-y-5">
        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <AvatarCircle src={displaySrc} name={fullName} size={72} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.45)" }}
              title="Change photo"
            >
              <Camera className="w-5 h-5" style={{ color: "#fff" }} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>{fullName || "Your name"}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{agency || "Your agency"}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 text-[12px] font-medium"
              style={{ color: "var(--kk-blue)" }}
            >
              {displaySrc ? "Change photo" : "Upload photo"}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--kk-line)" }} />

        {/* Profile fields */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="kk-overline mb-1.5">First name</p>
              <input type="text" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g. Kakisewa" style={INPUT_STYLE} />
            </div>
            <div className="flex-1">
              <p className="kk-overline mb-1.5">Last name</p>
              <input type="text" value={last} onChange={(e) => setLast(e.target.value)} placeholder="e.g. Agent" style={INPUT_STYLE} />
            </div>
          </div>
          <div>
            <p className="kk-overline mb-1.5">WhatsApp / phone</p>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))} placeholder="e.g. 60123456789" style={INPUT_STYLE} />
            <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Used as sender in WhatsApp message templates.</p>
          </div>
          <div>
            <p className="kk-overline mb-1.5">Agency / company</p>
            <input type="text" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. Kakisewa Property" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">REN number</p>
            <input type="text" value={ren} onChange={(e) => setRen(e.target.value)} placeholder="e.g. REN07128 or PEA1234" style={INPUT_STYLE} />
            <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Appended to your name in outreach messages. Leave blank if you don&apos;t have one.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending || !dirty}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: dirty ? "var(--kk-accent)" : "var(--kk-surface-2)",
              color: dirty ? "#fff" : "var(--kk-ink-faint)",
              cursor: pending || !dirty ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {pending ? "Saving…" : "Save profile"}
          </button>
          <Link
            href="/settings/account"
            onClick={onClose}
            className="text-[13px] transition-opacity hover:opacity-70"
            style={{ color: "var(--kk-ink-mute)", textDecoration: "underline" }}
          >
            Full settings
          </Link>
        </div>

      </div>
    </>
  );
}

// ── Subscription modal ────────────────────────────────────────────────────────

// Credit-card-inspired gradients
const TIER_STYLES = {
  Silver: {
    bg: "linear-gradient(145deg, #f5f5f5 0%, #e2e2e2 35%, #ececec 60%, #d0d0d0 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%)",
    ring: "0 0 0 2px #b0b0b0, 0 8px 32px rgba(0,0,0,0.12)",
    ink: "#1a1a1a",
    mute: "#555",
    faint: "#888",
    badge: { bg: "#d8d8d8", ink: "#444" },
    cta: { bg: "#1a1a1a", ink: "#fff" },
    plus: "#3a7a5a",
    check: "#3a7a5a",
    roiBg: "rgba(0,0,0,0.05)",
    roiBorder: "rgba(0,0,0,0.08)",
    roiInk: "#555",
    roiGreen: "#1F8B4C",
    current: false,
  },
  Platinum: {
    bg: "linear-gradient(145deg, #0b1f4a 0%, #1a3464 35%, #152a56 65%, #0a1a3c 100%)",
    shine: "linear-gradient(135deg, rgba(100,160,255,0.18) 0%, rgba(255,255,255,0) 55%)",
    ring: "0 0 0 2.5px #3d6cbf, 0 8px 32px rgba(26,52,100,0.45)",
    ink: "#ffffff",
    mute: "rgba(255,255,255,0.65)",
    faint: "rgba(255,255,255,0.4)",
    badge: { bg: "rgba(255,255,255,0.12)", ink: "rgba(255,255,255,0.7)" },
    cta: { bg: "rgba(255,255,255,0.15)", ink: "#fff" },
    plus: "#7dd3fc",
    check: "rgba(255,255,255,0.5)",
    roiBg: "rgba(255,255,255,0.07)",
    roiBorder: "rgba(255,255,255,0.12)",
    roiInk: "rgba(255,255,255,0.6)",
    roiGreen: "#7dd3fc",
    current: false,
  },
  Elite: {
    bg: "linear-gradient(145deg, #6b3d1e 0%, #a8692e 25%, #c98840 50%, #9a5e28 75%, #5c3015 100%)",
    shine: "linear-gradient(135deg, rgba(255,210,140,0.18) 0%, rgba(255,255,255,0) 50%)",
    ring: "0 0 0 2.5px #d4a96a, 0 8px 40px rgba(139,94,60,0.55)",
    ink: "#fff8f0",
    mute: "rgba(255,240,210,0.75)",
    faint: "rgba(255,230,190,0.5)",
    badge: { bg: "rgba(255,220,160,0.2)", ink: "rgba(255,230,190,0.9)" },
    cta: { bg: "rgba(255,240,210,0.18)", ink: "#fff8f0" },
    plus: "#fde68a",
    check: "rgba(255,240,200,0.55)",
    roiBg: "rgba(0,0,0,0.12)",
    roiBorder: "rgba(255,220,160,0.2)",
    roiInk: "rgba(255,230,200,0.75)",
    roiGreen: "#fde68a",
    current: false,
  },
};

const TIER_DATA = [
  {
    name: "Silver" as const,
    planId: "silver" as const,
    monthly: 198,
    annualMonthly: 165,
    annualTotal: 1980,
    annualSavings: 396,
    roiMonths: "10 months",
    features: [
      { label: "Bulk owner list upload", plus: false },
      { label: "Automatically track owner reply", plus: false },
      { label: "Customized and branded tenant pack", plus: false },
      { label: "Close more owners", plus: false },
    ],
    recommended: "New agents who need support in tracking owner responses and converting more new owners with branded profile and messaging.",
  },
  {
    name: "Platinum" as const,
    planId: "platinum" as const,
    monthly: 398,
    annualMonthly: 332,
    annualTotal: 3980,
    annualSavings: 796,
    roiMonths: "5 months",
    features: [
      { label: "Everything in Silver, plus:", italic: true },
      { label: "Unlock \"Existing contracts\"", plus: true },
      { label: "Capture all renewal commission", plus: true },
      { label: "Contract renewal reminder and messaging", plus: true },
    ],
    recommended: "Experienced agent who needs support in capturing all contract renewal income by tracking existing contracts.",
  },
  {
    name: "Elite" as const,
    planId: "elite" as const,
    monthly: 498,
    annualMonthly: 415,
    annualTotal: 4980,
    annualSavings: 996,
    roiMonths: "4 months",
    features: [
      { label: "Everything in Platinum, plus:", italic: true },
      { label: "Property support management", plus: true },
      { label: "Performance dashboard", plus: true },
      { label: "Analytics and newsletter", plus: true },
    ],
    recommended: "Elite agent who wants everything in one-place, including goal planning, performance tracking, property services contacts. Elite members get priority to all future updates.",
  },
];

function BillingModal({ trialDaysLeft }: { trialDaysLeft?: number | null }) {
  const currentTier = "trial";
  const [loading, setLoading] = useState<string | null>(null);
  const daysLabel = trialDaysLeft != null
    ? trialDaysLeft <= 0 ? "Trial ended" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
    : "Trial active";

  async function startCheckout(planId: string, interval: "monthly" | "annual") {
    const key = `${planId}-${interval}`;
    setLoading(key);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId, interval }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <>
      <div className="px-7 pt-5 pb-4 border-b" style={{ borderColor: "var(--kk-line)" }}>
        <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Subscription plan</p>
      </div>
      <div className="px-7 py-5 space-y-5">

        {/* ROI callout — top, shared */}
        <div className="px-1 py-2">
          <p className="text-[12px] font-medium mb-3" style={{ color: "var(--kk-ink-mute)" }}>
            Capture just <strong style={{ color: "var(--kk-ink)" }}>1 missed renewal at RM2,000</strong> means kakisewa is…
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TIER_DATA.map((t) => (
              <div key={t.name} className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>{t.name}</p>
                <p className="text-[18px] font-bold tabular-nums leading-none" style={{ color: "var(--kk-green)", letterSpacing: "-0.02em" }}>{t.roiMonths} free</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-3" style={{ position: "relative" }}>
          {/* Free trial badge above Elite */}
          <div className="absolute -top-3 right-0 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "linear-gradient(90deg, #1F8B4C, #22c55e)", color: "#fff", boxShadow: "0 2px 8px rgba(34,197,94,0.4)" }}>
            <Check className="w-3 h-3" />
            {daysLabel}
          </div>

          {TIER_DATA.map((t) => {
            const s = TIER_STYLES[t.name];
            const isTrial = currentTier === "trial" && t.name === "Elite";
            return (
              <div key={t.name} className="rounded-2xl p-5 flex flex-col gap-4 overflow-hidden"
                style={{
                  background: s.bg,
                  boxShadow: isTrial ? s.ring : "0 4px 16px rgba(0,0,0,0.10)",
                  position: "relative",
                }}
              >
                {/* Shine overlay */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none",
                  background: s.shine,
                }} />

                {/* Header */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: s.faint }}>
                    {t.name}
                  </p>
                  <p className="text-[26px] font-bold leading-none tabular-nums" style={{ color: s.ink, letterSpacing: "-0.03em" }}>
                    RM {t.monthly}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: s.mute }}>/month</p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {!("italic" in f && f.italic) && (
                        <span className="text-[12px] font-bold shrink-0 mt-px leading-none"
                          style={{ color: ("plus" in f && f.plus) ? s.plus : s.check }}>
                          {("plus" in f && f.plus) ? "+" : "✓"}
                        </span>
                      )}
                      <span className="text-[12.5px] leading-snug"
                        style={{
                          color: ("italic" in f && f.italic) ? s.faint : s.ink,
                          fontStyle: ("italic" in f && f.italic) ? "italic" : "normal",
                          fontWeight: ("plus" in f && f.plus) ? 600 : 400,
                        }}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Divider + Recommended for + CTA — pinned to bottom via mt-auto */}
                <div className="mt-auto flex flex-col gap-3">
                  <div style={{ borderTop: `1px solid ${s.faint}`, opacity: 0.5 }} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: s.faint }}>Recommended for</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: s.mute }}>{t.recommended}</p>
                  </div>
                  {/* Monthly CTA */}
                  <button
                    onClick={() => startCheckout(t.planId, "monthly")}
                    disabled={!!loading}
                    className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-center transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-1.5"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "#111",
                      border: "none",
                      opacity: loading ? 0.6 : 1,
                    }}>
                    {loading === `${t.planId}-monthly`
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Redirecting…</>
                      : "Monthly plan"}
                  </button>
                  {/* Annual CTA */}
                  <button
                    onClick={() => startCheckout(t.planId, "annual")}
                    disabled={!!loading}
                    className="w-full py-2.5 rounded-xl text-center transition-all hover:scale-[1.03] active:scale-[0.98] flex flex-col items-center justify-center gap-0"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "#111",
                      border: "none",
                      opacity: loading ? 0.6 : 1,
                    }}>
                    {loading === `${t.planId}-annual`
                      ? <span className="text-[12px] font-semibold flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Redirecting…</span>
                      : <>
                          <span className="text-[12px] font-semibold leading-snug">Annual plan</span>
                          <span className="text-[10px] font-medium leading-snug" style={{ color: "#1F8B4C" }}>
                            save RM {t.annualSavings}/year
                          </span>
                        </>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
          Secure payment via Stripe · Cancel anytime · No lock-in
        </p>
      </div>
    </>
  );
}


// ── TopNav ────────────────────────────────────────────────────────────────────
// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_BADGE = {
  god: {
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1a0a00 30%, #5c3a00 55%, #c8960a 70%, #1a0a00 100%)",
    shine: "linear-gradient(135deg, rgba(255,210,50,0.55) 0%, rgba(255,255,255,0) 50%)",
    border: "rgba(200,150,10,0.95)",
    ink: "#fff8dc",
    shadow: "0 2px 14px rgba(180,120,0,0.6), inset 0 1px 0 rgba(255,215,0,0.35)",
    label: "God tier",
  },
  silver: {
    bg: "linear-gradient(135deg, #c8c8c8 0%, #f0f0f0 45%, #d4d4d4 70%, #b8b8b8 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(160,160,160,0.8)",
    ink: "#1a1a1a",
    shadow: "0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
    label: "Silver",
  },
  gold: {
    bg: "linear-gradient(135deg, #92400e 0%, #d97706 25%, #eab308 50%, #fcd34d 68%, #ca8a04 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,180,0.55) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(234,179,8,0.9)",
    ink: "#fff8e1",
    shadow: "0 2px 10px rgba(100,70,0,0.4), inset 0 1px 0 rgba(255,248,150,0.4)",
    label: "Gold",
  },
  platinum: {
    bg: "linear-gradient(135deg, #0b1f4a 0%, #2040a0 40%, #152a56 70%, #0a1a3c 100%)",
    shine: "linear-gradient(135deg, rgba(120,170,255,0.35) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(80,130,220,0.9)",
    ink: "#ffffff",
    shadow: "0 2px 10px rgba(26,52,100,0.55), inset 0 1px 0 rgba(120,170,255,0.3)",
    label: "Platinum",
  },
  elite: {
    bg: "linear-gradient(135deg, #5c3015 0%, #c98840 40%, #a8692e 65%, #6b3d1e 100%)",
    shine: "linear-gradient(135deg, rgba(255,215,120,0.45) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(200,160,80,0.9)",
    ink: "#fff8f0",
    shadow: "0 2px 10px rgba(100,60,20,0.5), inset 0 1px 0 rgba(255,220,100,0.3)",
    label: "Elite",
  },
} as const;

function TierBadge({ plan, isOnTrial, isAdmin, isBeta, small }: { plan?: "silver" | "gold" | "platinum" | "elite" | null; isOnTrial?: boolean; isAdmin?: boolean; isBeta?: boolean; small?: boolean }) {
  const key: keyof typeof TIER_BADGE | "trial" | null =
    isAdmin ? "god" : (plan ?? (isOnTrial ? "trial" : null));

  if (!key) return null;

  const px = small ? "px-2" : "px-3";
  const py = small ? "py-0.5" : "py-1.5";
  const fs = small ? "text-[9px]" : "text-[11px]";

  if (key === "trial") {
    return (
      <div
        className={`inline-flex items-center gap-1 ${px} ${py} rounded-full relative overflow-hidden select-none`}
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%)",
          border: "1px solid rgba(217,119,6,0.8)",
          boxShadow: "0 2px 8px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)" }} />
        <span className={`${fs} font-bold tracking-widest uppercase relative`} style={{ color: "#78350f", letterSpacing: "0.12em" }}>{isBeta ? "Beta" : "Trial"}</span>
      </div>
    );
  }

  const t = TIER_BADGE[key];
  return (
    <div
      className={`inline-flex items-center gap-1 ${px} ${py} rounded-full relative overflow-hidden select-none`}
      style={{ background: t.bg, border: `1px solid ${t.border}`, boxShadow: t.shadow }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: t.shine }} />
      <span className={`${fs} font-bold tracking-widest uppercase relative`} style={{ color: t.ink, letterSpacing: "0.12em" }}>{t.label}</span>
    </div>
  );
}

interface TopNavProps {
  agent: AgentProfile;
  isAdmin?: boolean;
  trialDaysLeft?: number | null;
  hideTabs?: boolean;
}

type ActiveModal = "account" | "billing" | null;

export function TopNav({ agent, isAdmin, trialDaysLeft, hideTabs }: TopNavProps) {
  const path = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [themeKey, setThemeKey] = useState(agent.accent_color ?? "default");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePos, setThemePos] = useState({ top: 0, right: 0 });
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tourMenuActive, setTourMenuActive] = useState(false);

  useEffect(() => {
    if (!tourMenuActive) setMobileMenuOpen(false);
  }, [path, tourMenuActive]);

  // Tour can open/close the mobile menu to reveal nav items
  useEffect(() => {
    function onTourOpenMenu() { setTourMenuActive(true); setMobileMenuOpen(true); }
    function onTourCloseMenu() { setTourMenuActive(false); setMobileMenuOpen(false); }
    document.addEventListener("kk:tour-open-menu", onTourOpenMenu);
    document.addEventListener("kk:tour-close-menu", onTourCloseMenu);
    return () => {
      document.removeEventListener("kk:tour-open-menu", onTourOpenMenu);
      document.removeEventListener("kk:tour-close-menu", onTourCloseMenu);
    };
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const inButton = btnRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inButton && !inDropdown) setMenuOpen(false);
      const inThemeBtn = themeBtnRef.current?.contains(target);
      const inThemeDropdown = themeDropdownRef.current?.contains(target);
      if (!inThemeBtn && !inThemeDropdown) setThemeOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuOpen(false); setThemeOpen(false); }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function pickTheme(t: Theme) {
    setThemeKey(t.key);
    applyTheme(t);
    saveProfileDetails({ accent_color: t.key });
  }

  function handleToggle() {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setThemeOpen(false);
    setMenuOpen((o) => !o);
  }

  function handleMobileAccountToggle() {
    if (!menuOpen && mobileBtnRef.current) {
      const rect = mobileBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setMenuOpen((o) => !o);
  }

  function handleThemeToggle() {
    if (!themeOpen && themeBtnRef.current) {
      const rect = themeBtnRef.current.getBoundingClientRect();
      setThemePos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setMenuOpen(false);
    setThemeOpen((o) => !o);
  }

  function openModal(modal: ActiveModal) {
    setMenuOpen(false);
    setActiveModal(modal);
  }


  const currentTheme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];

  const profilePath = (() => {
    if (agent.subscription_plan !== "platinum" && agent.subscription_plan !== "elite") return null;
    const firstName = (agent.name ?? "agent").trim().split(/\s+/)[0].toLowerCase();
    return agent.ren_number
      ? `/agent/${encodeURIComponent(firstName)}/${encodeURIComponent(agent.ren_number)}`
      : `/agent/${String(agent.id)}`;
  })();

  const MENU_ITEMS = [
    { icon: Compass,     label: "Getting started",  action: () => { setMenuOpen(false); setMobileMenuOpen(false); document.dispatchEvent(new CustomEvent(DEMO_EVENT)); } },
    { divider: true },
    ...(profilePath ? [{ icon: User, label: "Agent profile", highlight: true, action: () => { setMenuOpen(false); setMobileMenuOpen(false); router.push("/settings/profile"); } }] : []),
    { icon: User,        label: "Account settings", action: () => openModal("account") },
    { icon: CreditCard,  label: "Subscription",     action: () => { setMenuOpen(false); setMobileMenuOpen(false); router.push("/subscription"); } },
    { icon: HelpCircle,  label: "Help & support",   action: () => { setMenuOpen(false); setMobileMenuOpen(false); router.push("/faq"); } },
    ...(isAdmin ? [{ divider: true }, { icon: ShieldCheck, label: "Admin dashboard", action: () => { setMenuOpen(false); router.push("/admin"); } }] : []),
    { divider: true },
    { icon: LogOut,      label: "Sign out", danger: true, action: () => { setMenuOpen(false); router.push("/auth/signout"); } },
  ];

  return (
    <>
      <header className="kk-topnav">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-3 lg:px-5 gap-8">
          {/* Sidebar toggle — mobile only */}
          <button
            className="kk-topnav-hamburger items-center justify-center w-10 h-10 rounded-full -ml-2 shrink-0"
            onClick={() => document.dispatchEvent(new CustomEvent("kk-sidebar-toggle"))}
            aria-label="Open navigation"
            style={{ color: "var(--kk-topnav-ink)" }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand */}
          <Link href="/home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0" style={{ color: "var(--kk-topnav-ink)" }} aria-label="kakisewa home">
            <Logo size={32} />
            <span className="flex flex-col leading-none gap-[3px]">
              <span className="serif text-[20px] tracking-tight leading-none">kakisewa</span>
              <span className="flex justify-between leading-none font-semibold" style={{ fontSize: 9, opacity: 0.65, fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>
                {"カキセワ".split("").map((c, i) => <span key={i}>{c}</span>)}
              </span>
            </span>
          </Link>

          {/* Tier badge — mobile only, compact size */}
          <div className="md:hidden">
            <TierBadge plan={agent.subscription_plan} isOnTrial={trialDaysLeft != null && trialDaysLeft > 0} isAdmin={isAdmin} isBeta={agent.subscription_status === "beta"} small />
          </div>

          {/* Nav — desktop only (hidden when sidebar is active) */}
          {!hideTabs && <nav className="kk-topnav-desktop items-center gap-1">
            {NAV.map((NAV_ITEM) => {
              const active = NAV_ITEM.matchPaths.some((p) => path === p || path.startsWith(`${p}/`));
              const locked = !navHasAccess(NAV_ITEM.minPlan, agent.subscription_plan, agent.subscription_status, !!isAdmin);
              const upgradeTo = NAV_ITEM.minPlan === "elite" ? "Elite" : "Platinum";
              if (locked) {
                return (
                  <button
                    key={NAV_ITEM.href}
                    id={NAV_ITEM.tourId}
                    onClick={() => router.push("/subscription")}
                    className="kk-topnav-link font-medium flex items-center gap-1 opacity-40 cursor-pointer"
                    title={`${upgradeTo} plan required`}
                  >
                    {NAV_ITEM.label}
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.7 }}>
                      <rect x="2" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                );
              }
              return (
                <Link key={NAV_ITEM.href} href={NAV_ITEM.href} id={NAV_ITEM.tourId} data-active={active} className={cn("kk-topnav-link font-medium")}>
                  {NAV_ITEM.label}
                </Link>
              );
            })}
          </nav>}

          {/* Right cluster — desktop only */}
          <div className="kk-topnav-desktop ml-auto items-center gap-3">
            <NotificationBell />
            <TierBadge plan={agent.subscription_plan} isOnTrial={trialDaysLeft != null && trialDaysLeft > 0} isAdmin={isAdmin} isBeta={agent.subscription_status === "beta"} />

            <button
              ref={btnRef}
              onClick={handleToggle}
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full transition-colors"
              style={{
                background: menuOpen ? "var(--kk-accent)" : "var(--kk-surface-2)",
                border: "1px solid",
                borderColor: menuOpen ? "transparent" : "var(--kk-line)",
              }}
              aria-label="Account menu"
            >
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name ?? "avatar"}
                  width={28}
                  height={28}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", display: "block", outline: menuOpen ? "none" : `2px solid var(--kk-accent)`, outlineOffset: 1 }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: menuOpen ? "#fff" : "var(--kk-accent)", color: menuOpen ? "var(--kk-accent)" : "#fff" }}>
                  {initials(agent.name)}
                </div>
              )}
              {agent.name && (
                <span className="text-[13px] font-bold" style={{ color: menuOpen ? "#fff" : "var(--kk-accent)" }}>
                  {initials(agent.name)}
                </span>
              )}
              <ChevronDown className="w-3 h-3 transition-transform"
                style={{ color: menuOpen ? "#fff" : "var(--kk-ink-faint)", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            {/* Theme picker — compact rounded rect, 3D look */}
            <button
              ref={themeBtnRef}
              onClick={handleThemeToggle}
              className="shrink-0 transition-all"
              style={{
                height: 22,
                width: 36,
                borderRadius: 7,
                background: currentTheme.preview,
                outline: themeOpen ? `2px solid ${currentTheme.preview}` : "none",
                outlineOffset: 2,
                boxShadow: themeOpen
                  ? "inset 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(0,0,0,0.10)"
                  : "0 2px 0 rgba(0,0,0,0.28), 0 4px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.45)",
                transform: themeOpen ? "translateY(1px)" : "translateY(0)",
              }}
              aria-label="Change theme"
            />
          </div>

          {/* Right cluster — mobile only */}
          <div className="kk-topnav-hamburger ml-auto items-center gap-1">
            <NotificationBell />
            <button
              ref={mobileBtnRef}
              onClick={handleMobileAccountToggle}
              className="flex items-center justify-center w-11 h-11 rounded-full"
              style={{ color: "var(--kk-topnav-ink)" }}
              aria-label="Account"
            >
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name ?? "avatar"}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--kk-accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  {initials(agent.name)}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Dropdown */}
        {menuOpen && (
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 99999, background: "#fff", border: "1px solid var(--kk-line)", borderRadius: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.14)", minWidth: 220, overflow: "hidden" }}
          >
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--kk-line)" }}>
              <AvatarCircle src={agent.photo_url} name={agent.name} size={36} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: "var(--kk-ink)" }}>{agent.name ?? "My account"}</p>
                <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--kk-ink-mute)" }}>{agent.agency ?? "kakisewa Agent"}</p>
              </div>
            </div>
            <div className="py-1.5">
              {MENU_ITEMS.map((item, i) => {
                if ("divider" in item) {
                  return <div key={i} className="my-1 border-t" style={{ borderColor: "var(--kk-line)" }} />;
                }
                const Icon = item.icon!;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left transition-colors hover:bg-[var(--kk-surface-2)]"
                    style={{ color: item.danger ? "#DC2626" : "highlight" in item && item.highlight ? "var(--kk-blue)" : "var(--kk-ink-soft)" }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ opacity: item.danger ? 1 : 0.65 }} />
                    {item.label}
                    {"highlight" in item && item.highlight && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--kk-blue)", color: "#fff", opacity: 0.85 }}>
                        SHARE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Theme dropdown */}
        {themeOpen && (
          <div
            ref={themeDropdownRef}
            style={{ position: "fixed", top: themePos.top, right: themePos.right, zIndex: 99999, background: "#fff", border: "1px solid var(--kk-line)", borderRadius: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.14)", width: 220, overflow: "hidden" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--kk-line)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>Dashboard theme</p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--kk-line)" }}>
              {THEMES.map((t) => {
                const active = themeKey === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => pickTheme(t)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                    style={{ background: active ? "var(--kk-surface-2)" : "transparent" }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: t.preview, display: "inline-block", flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }} />
                    <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{t.name}</span>
                    <span style={{
                      display: "inline-flex", width: 36, height: 20, borderRadius: 10,
                      background: active ? "var(--kk-accent)" : "var(--kk-line-strong)",
                      transition: "background 160ms ease", flexShrink: 0, alignItems: "center", padding: "0 3px",
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%", background: "#fff",
                        transform: active ? "translateX(16px)" : "translateX(0)",
                        transition: "transform 160ms ease", display: "block",
                      }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="kk-topnav-hamburger fixed inset-0 flex-col" style={{ zIndex: tourMenuActive ? 100000 : 99990, background: "var(--kk-topnav-bg)" }}>
          {/* Top row */}
          <div className="flex items-center justify-between h-16 px-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <Link href="/home" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5" style={{ color: "var(--kk-topnav-ink)" }}>
              <Logo size={32} />
              <span className="flex flex-col leading-none gap-[3px]">
                <span className="serif text-[20px] tracking-tight leading-none">kakisewa</span>
                <span className="flex justify-between leading-none font-semibold" style={{ fontSize: 9, opacity: 0.65, fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>
                  {"カキセワ".split("").map((c, i) => <span key={i}>{c}</span>)}
                </span>
              </span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full"
              style={{ color: "var(--kk-topnav-ink)" }}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Nav links — hidden when bottom tab bar is active */}
            {!hideTabs && <div className="px-4 py-4 space-y-1">
              {NAV.map((item) => {
                const active = item.matchPaths.some((p) => path === p || path.startsWith(`${p}/`));
                const locked = !navHasAccess(item.minPlan, agent.subscription_plan, agent.subscription_status, !!isAdmin);
                if (locked) {
                  return (
                    <button
                      key={item.href}
                      id={item.tourId + "-mobile"}
                      onClick={() => { setMobileMenuOpen(false); router.push("/subscription"); }}
                      className="flex items-center justify-between w-full px-4 h-12 rounded-2xl text-[15px] font-medium opacity-40"
                      style={{ color: "var(--kk-topnav-ink)" }}
                    >
                      <span>{item.label}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="2" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    id={item.tourId + "-mobile"}
                    onClick={() => { if (!tourMenuActive) setMobileMenuOpen(false); }}
                    className="flex items-center px-4 h-12 rounded-2xl text-[15px] font-medium"
                    style={{
                      background: active ? "var(--kk-accent)" : "transparent",
                      color: active ? "#fff" : "var(--kk-topnav-ink)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>}

            {!hideTabs && <div className="mx-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />}

            {/* Account section */}
            <div className="px-4 py-4 space-y-1">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <AvatarCircle src={agent.photo_url} name={agent.name} size={40} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--kk-topnav-ink)" }}>{agent.name ?? "My account"}</p>
                  <p className="text-[12px]" style={{ color: "var(--kk-topnav-mute)" }}>{agent.agency ?? "kakisewa Agent"}</p>
                </div>
              </div>
              {MENU_ITEMS.map((item, i) => {
                if ("divider" in item) return <div key={i} className="my-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />;
                const Icon = item.icon!;
                return (
                  <button
                    key={item.label}
                    onClick={() => { setMobileMenuOpen(false); item.action?.(); }}
                    className="w-full flex items-center gap-3 px-4 h-11 text-[14px] text-left rounded-xl transition-colors hover:bg-white/10"
                    style={{ color: item.danger ? "#f87171" : "var(--kk-topnav-ink)", opacity: item.danger ? 1 : 0.82 }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {"highlight" in item && item.highlight && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fff", color: "#0b1f4a" }}>
                        SHARE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Theme picker */}
            <div className="px-4 pb-10">
              <div className="mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 px-4" style={{ color: "var(--kk-topnav-ink)", opacity: 0.5 }}>Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => {
                  const active = themeKey === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => pickTheme(t)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left"
                      style={{
                        background: active ? "rgba(255,255,255,0.12)" : "transparent",
                        border: `1px solid ${active ? "var(--kk-accent)" : "rgba(255,255,255,0.2)"}`,
                        color: "var(--kk-topnav-ink)",
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: t.preview, display: "inline-block", flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }} />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === "account" && (
        <Modal onClose={() => setActiveModal(null)}>
          <AccountModal agent={agent} onClose={() => setActiveModal(null)} />
        </Modal>
      )}
      {activeModal === "billing" && (
        <Modal onClose={() => setActiveModal(null)} wide>
          <BillingModal trialDaysLeft={trialDaysLeft} />
        </Modal>
      )}
    </>
  );
}
