"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useTransition } from "react";
import { Logo } from "@/components/logo";
import { BetaCountdown } from "@/components/beta-countdown";
import { cn } from "@/lib/utils";
import { CreditCard, HelpCircle, LogOut, User, ChevronDown, X, Check, Loader2, Mail, MessageCircle, BookOpen, ChevronDown as ChevronDownFAQ, Camera, Menu, Compass } from "lucide-react";
import { TOUR_EVENT } from "@/components/spotlight-tour";
import { THEMES, getTheme, type Theme } from "@/components/accent-provider";
import { AgentProfile } from "@/lib/types";
import { saveProfileDetails } from "@/lib/actions";
import { PhotoCropModal } from "@/components/photo-crop-modal";
import { toast } from "sonner";

const NAV = [
  { href: "/home",        label: "Home",               matchPaths: ["/home"],                                             tourId: "tour-nav-home" },
  { href: "/leads",       label: "New Owners",         matchPaths: ["/leads"],                                            tourId: "tour-nav-new-owners" },
  { href: "/tenancies",   label: "Existing Contracts", matchPaths: ["/tenancies"],                                        tourId: "tour-nav-contracts" },
  { href: "/network",     label: "Directory",          matchPaths: ["/network", "/database", "/supports", "/tenants"],    tourId: "tour-nav-directory" },
  { href: "/performance", label: "Performance",        matchPaths: ["/performance"],                                      tourId: "tour-nav-performance" },
];

function initials(name?: string | null): string {
  if (!name) return "KK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Modal overlay wrapper ─────────────────────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        style={{ maxWidth: 520, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--kk-line)" }}
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
        <PhotoCropModal
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
              <input type="text" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g. Howard" style={INPUT_STYLE} />
            </div>
            <div className="flex-1">
              <p className="kk-overline mb-1.5">Last name</p>
              <input type="text" value={last} onChange={(e) => setLast(e.target.value)} placeholder="e.g. Ho" style={INPUT_STYLE} />
            </div>
          </div>
          <div>
            <p className="kk-overline mb-1.5">WhatsApp / phone</p>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 60107609699" style={INPUT_STYLE} />
            <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Used as sender in WhatsApp message templates.</p>
          </div>
          <div>
            <p className="kk-overline mb-1.5">Agency / company</p>
            <input type="text" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. Wonders Property" style={INPUT_STYLE} />
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
const SOLO_FEATURES = [
  "Up to 30 active tenancies",
  "Renewal lifecycle board",
  "WhatsApp check-in templates",
  "Commission & performance tracking",
  "CSV bulk import",
];

const PRO_FEATURES = [
  "Unlimited properties & tenancies",
  "Everything in Solo, plus:",
  "Make new money pipeline",
  "Owner & tenant intake forms",
  "Tenant matching & share packs",
  "AI-powered receipt verification",
  "Priority support",
];

function PlanCard({
  name, price, features, current, accent,
}: {
  name: string;
  price: string;
  features: string[];
  current?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: accent ? "var(--kk-ink)" : "var(--kk-surface-2)",
        border: accent ? "none" : "1px solid var(--kk-line)",
        position: "relative",
      }}
    >
      {current && (
        <span
          className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: accent ? "rgba(255,255,255,0.18)" : "var(--kk-green-soft)", color: accent ? "#fff" : "#1F8B4C" }}
        >
          current
        </span>
      )}
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: accent ? "rgba(255,255,255,0.55)" : "var(--kk-ink-faint)" }}>{name}</p>
        <p className="text-[24px] font-bold tabular-nums mt-0.5" style={{ color: accent ? "#fff" : "var(--kk-ink)", letterSpacing: "-0.02em" }}>
          {price}<span className="text-[13px] font-normal opacity-60 ml-1">/mo</span>
        </p>
      </div>
      <ul className="space-y-1.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: accent ? "rgba(255,255,255,0.6)" : "var(--kk-green)" }} />
            <span className="text-[12px] leading-snug" style={{ color: accent ? "rgba(255,255,255,0.8)" : "var(--kk-ink)", fontStyle: f === "Everything in Solo, plus:" ? "italic" : "normal", opacity: f === "Everything in Solo, plus:" ? 0.6 : 1 }}>
              {f}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BillingModal() {
  return (
    <>
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--kk-line)" }}>
        <p className="kk-overline mb-0.5">Settings</p>
        <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Subscription</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
          You're on the <strong style={{ color: "var(--kk-ink)" }}>beta plan</strong>. All features unlocked until launch. Billing activates at public release.
        </p>

        {/* Plan cards */}
        <div className="flex gap-3">
          <PlanCard name="Solo" price="RM 79" features={SOLO_FEATURES} />
          <PlanCard name="Pro" price="RM 199" features={PRO_FEATURES} accent current />
        </div>

        {/* Payment */}
        <div className="space-y-2 pt-1">
          <button disabled className="w-full py-2.5 rounded-xl font-semibold text-[14px] opacity-40 cursor-not-allowed" style={{ background: "var(--kk-ink)", color: "#fff" }}>
            Pay with Card (Stripe), coming soon
          </button>
          <button disabled className="w-full py-2.5 rounded-xl font-semibold text-[14px] opacity-40 cursor-not-allowed" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
            Pay via FPX (Billplz), coming soon
          </button>
          <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>Cancel anytime. No lock-in.</p>
        </div>
      </div>
    </>
  );
}

// ── Help & support modal ──────────────────────────────────────────────────────
const FAQS = [
  { q: "How do I import owner leads?", a: "Go to Manage new leads → click the import button top-right. Upload a CSV with columns: owner_name, owner_phone, property_name, unit, expected_rent, bedrooms, bathrooms." },
  { q: "Why is only 1 WhatsApp message sending?", a: "Browsers block multiple window.open calls in quick succession. Use the card's detail dialog to send tenant and owner messages separately." },
  { q: "How does the renewal pipeline work?", a: "Tenancies within 60 days of expiry appear in Follow-up. Send check-ins, track T/O replies, then move to Pinged → Renewing once both confirm. Confirming commission resets the card to Active." },
  { q: "How is commission calculated?", a: "Default is 1 month's rent = 100%. Override per deal in the lead card, or change the agency default under Set goals." },
  { q: "Is my data backed up?", a: "During beta, data is stored locally on the server. CSV export is coming soon. Automatic cloud backups will be added before public launch." },
];

function SupportModal() {
  return (
    <>
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--kk-line)" }}>
        <p className="kk-overline mb-0.5">Settings</p>
        <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Help & support</p>
      </div>
      <div className="px-6 py-5 space-y-5">
        {/* Contact */}
        <div className="flex gap-3">
          <a href="mailto:support@kakisewa.com" className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-colors" style={{ background: "var(--kk-surface-2)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--kk-blue-soft)", color: "var(--kk-blue)" }}>
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>Email us</p>
              <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>support@kakisewa.com</p>
            </div>
          </a>
          <a href="https://wa.me/60107609699" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-colors" style={{ background: "var(--kk-surface-2)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)", color: "var(--kk-green)" }}>
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>WhatsApp</p>
              <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>Reply within 1 day</p>
            </div>
          </a>
        </div>

        {/* FAQ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-mute)" }} />
            <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>Common questions</p>
          </div>
          <div className="rounded-2xl overflow-hidden divide-y" style={{ border: "1px solid var(--kk-line)", borderColor: "var(--kk-line)" }}>
            {FAQS.map((faq, i) => (
              <details key={i} className="group px-4 py-3">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-3">
                  <span className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{faq.q}</span>
                  <ChevronDownFAQ className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-180" style={{ color: "var(--kk-ink-faint)" }} />
                </summary>
                <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        <a href="mailto:support@kakisewa.com?subject=Beta feedback" className="inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full" style={{ background: "var(--kk-ink)", color: "#fff" }}>
          <Mail className="w-3.5 h-3.5" />
          Send feedback
        </a>
      </div>
    </>
  );
}

// ── TopNav ────────────────────────────────────────────────────────────────────
interface TopNavProps {
  agent: AgentProfile;
}

type ActiveModal = "account" | "billing" | "support" | null;

export function TopNav({ agent }: TopNavProps) {
  const path = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [themeKey, setThemeKey] = useState(agent.accent_color ?? "default");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePos, setThemePos] = useState({ top: 0, right: 0 });
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

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
    const r = document.documentElement;
    r.style.setProperty("--kk-bg", t.bg);
    r.style.setProperty("--kk-topnav-bg", t.topnavBg);
    r.style.setProperty("--kk-bar-bg", t.barBg);
    r.style.setProperty("--kk-accent", t.accent);
    r.style.setProperty("--kk-topnav-ink", t.topnavInk ?? "var(--kk-ink)");
    r.style.setProperty("--kk-topnav-mute", t.topnavMute ?? "var(--kk-ink-mute)");
    r.style.setProperty("--kk-topnav-active", t.topnavActive ?? t.accent);
    r.style.setProperty("--kk-bar-ink", t.barInk ?? "var(--kk-ink)");
    r.style.setProperty("--kk-bar-mute", t.barMute ?? "var(--kk-ink-mute)");
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

  const MENU_ITEMS = [
    { icon: Compass,     label: "Getting started",  action: () => { setMenuOpen(false); setMobileMenuOpen(false); document.dispatchEvent(new CustomEvent(TOUR_EVENT)); } },
    { divider: true },
    { icon: User,        label: "Account settings", action: () => openModal("account") },
    { icon: CreditCard,  label: "Subscription",     action: () => openModal("billing") },
    { icon: HelpCircle,  label: "Help & support",   action: () => openModal("support") },
    { divider: true },
    { icon: LogOut,      label: "Sign out", danger: true, action: () => { setMenuOpen(false); router.push("/sign-in"); } },
  ];

  return (
    <>
      <header className="kk-topnav">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-3 lg:px-5 gap-8">
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

          {/* Nav — desktop only */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((NAV_ITEM) => {
              const active = NAV_ITEM.matchPaths.some((p) => path === p || path.startsWith(`${p}/`));
              return (
                <Link key={NAV_ITEM.href} href={NAV_ITEM.href} id={NAV_ITEM.tourId} data-active={active} className={cn("kk-topnav-link font-medium")}>
                  {NAV_ITEM.label}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster — desktop only */}
          <div className="ml-auto hidden lg:flex items-center gap-3">
            <BetaCountdown />

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

          {/* Hamburger — mobile only */}
          <button
            className="ml-auto lg:hidden flex items-center justify-center w-11 h-11 rounded-full"
            onClick={() => setMobileMenuOpen((o) => !o)}
            style={{ color: "var(--kk-topnav-ink)" }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
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
                    style={{ color: item.danger ? "#DC2626" : "var(--kk-ink-soft)" }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ opacity: item.danger ? 1 : 0.65 }} />
                    {item.label}
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
        <div className="fixed inset-0 z-[99990] lg:hidden flex flex-col" style={{ background: "var(--kk-topnav-bg)" }}>
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
            {/* Nav links */}
            <div className="px-4 py-4 space-y-1">
              {NAV.map((item) => {
                const active = item.matchPaths.some((p) => path === p || path.startsWith(`${p}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
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
            </div>

            <div className="mx-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

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
        <Modal onClose={() => setActiveModal(null)}>
          <BillingModal />
        </Modal>
      )}
      {activeModal === "support" && (
        <Modal onClose={() => setActiveModal(null)}>
          <SupportModal />
        </Modal>
      )}
    </>
  );
}
