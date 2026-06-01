"use client";

import { useState, useTransition, useRef, useMemo, useCallback, useEffect } from "react";
import { AgentProfile } from "@/lib/types";
import { saveProfileDetails, saveWhatsAppTemplatesAction } from "@/lib/actions";
import {
  TEMPLATE_SPECS,
  parseTemplateOverrides,
  type TemplateKey,
  type TemplateOverrides,
  type TemplateSpec,
  type TemplateVar,
} from "@/lib/whatsapp-templates";
import { toast } from "sonner";
import { Loader2, ChevronDown, RotateCcw, Eye, X, Info } from "lucide-react";

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

// camelCase → "Title Case", with URL suffix fix
function tokenLabel(key: string): string {
  return key
    .replace(/Url$/, "_URL")
    .replace(/([A-Z])/g, " $1")
    .replace(/_URL$/, " URL")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const PILL_STYLE =
  "display:inline-block;background:var(--kk-accent,#4f46e5);color:#fff;" +
  "border-radius:100px;padding:1px 8px;font-size:11px;font-weight:600;" +
  "white-space:nowrap;user-select:none;margin:0 2px;vertical-align:middle;line-height:1.6";

// ── Rich template editor ──────────────────────────────────────────────────────

function useRichEditor(
  value: string,
  variables: TemplateVar[],
  onChange: (v: string) => void
) {
  // elementRef is the imperative handle; divRef is a callback ref that fires
  // every time the element mounts (i.e. every time the accordion opens).
  const elementRef = useRef<HTMLDivElement | null>(null);
  const lastRaw = useRef(value);    // what the DOM currently shows
  const latestRaw = useRef(value);  // latest value prop (read by callback ref)
  latestRaw.current = value;

  const varPattern = useMemo(
    () => new RegExp(`\\{\\{(${variables.map((v) => v.key).join("|")})\\}\\}`, "g"),
    [variables]
  );

  const rawToHtml = useCallback(
    (raw: string): string => {
      const parts: string[] = [];
      let last = 0;
      varPattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = varPattern.exec(raw)) !== null) {
        if (m.index > last) {
          parts.push(
            raw
              .slice(last, m.index)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>")
          );
        }
        const key = m[1];
        parts.push(
          `<span contenteditable="false" data-var="${key}" style="${PILL_STYLE}">${tokenLabel(key)}</span>`
        );
        last = m.index + m[0].length;
      }
      if (last < raw.length) {
        parts.push(
          raw
            .slice(last)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")
        );
      }
      return parts.join("");
    },
    [varPattern]
  );

  const domToRaw = useCallback((el: HTMLElement): string => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLElement>("[data-var]").forEach((span) => {
      span.replaceWith(document.createTextNode(`{{${span.dataset.var}}}`));
    });
    clone.querySelectorAll("br").forEach((br) => {
      br.replaceWith(document.createTextNode("\n"));
    });
    clone.querySelectorAll("div, p").forEach((block) => {
      if (block.previousSibling) {
        block.insertBefore(document.createTextNode("\n"), block.firstChild);
      }
      block.replaceWith(...Array.from(block.childNodes));
    });
    return clone.textContent ?? "";
  }, []);

  // Callback ref fires on every mount of the editor element (each accordion open).
  // Uses latestRaw so re-opens show the current content, not stale initial value.
  const divRef = useCallback(
    (el: HTMLDivElement | null) => {
      elementRef.current = el;
      if (!el) return;
      el.innerHTML = rawToHtml(latestRaw.current);
      lastRaw.current = latestRaw.current;
    },
    [rawToHtml]
  );

  // External value change (e.g. "Reset to default"): update innerHTML if mounted.
  useEffect(() => {
    const el = elementRef.current;
    if (!el || value === lastRaw.current) return;
    el.innerHTML = rawToHtml(value);
    lastRaw.current = value;
  }, [value, rawToHtml]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Backspace") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const { startContainer, startOffset } = range;
    let pill: ChildNode | null = null;

    // Cursor inside a text node at position 0 → check previous sibling
    if (startContainer.nodeType === Node.TEXT_NODE && startOffset === 0) {
      const prev = startContainer.previousSibling;
      if (prev && (prev as HTMLElement).dataset?.var) pill = prev;
    }
    // Cursor inside the editor element itself → child at (offset-1) is a pill
    if (!pill && startContainer === elementRef.current && startOffset > 0) {
      const prev = startContainer.childNodes[startOffset - 1];
      if (prev && (prev as HTMLElement).dataset?.var) pill = prev;
    }

    if (!pill) return;
    e.preventDefault();
    pill.remove();
    const el = elementRef.current;
    if (!el) return;
    const raw = domToRaw(el);
    lastRaw.current = raw;
    onChange(raw);
  }, [domToRaw, onChange]);

  const handleInput = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    const raw = domToRaw(el);
    lastRaw.current = raw;
    onChange(raw);
  }, [domToRaw, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const insertPill = useCallback(
    (key: string) => {
      const el = elementRef.current;
      if (!el) return;
      el.focus();
      const span = document.createElement("span");
      span.contentEditable = "false";
      span.dataset.var = key;
      span.setAttribute("style", PILL_STYLE);
      span.textContent = tokenLabel(key);

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        const after = document.createRange();
        after.setStartAfter(span);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      }

      const raw = domToRaw(el);
      lastRaw.current = raw;
      onChange(raw);
    },
    [domToRaw, onChange]
  );

  return { divRef, handleInput, handleKeyDown, handlePaste, insertPill };
}

// ── WhatsApp preview modal ────────────────────────────────────────────────────

const SAMPLE_VARS: Partial<Record<TemplateKey, Record<string, string>>> = {
  owner_intake_form: {
    firstName: "Howard",
    company: "Property Max",
    propertyName: "Agile Mont Kiara, Unit B-1802",
    tenantSamplePack: "kakisewa.com/sample-tenant-pack",
    listingForm: "kakisewa.com/o/abc123xyz",
  },
  expiry_check_tenant: {
    tenantName: "Ahmad Firdaus",
    agentLine: "I'm Howard from Property Max. ",
    propertyName: "Agile Mont Kiara",
    expiryWhen: "in 14 days",
    renewalForm: "kakisewa.com/rt/abc123xyz",
  },
  expiry_check_owner: {
    ownerName: "Encik Azlan",
    agentLine: "I'm Howard from Property Max. ",
    propertyName: "Agile Mont Kiara",
    tenantName: "Ahmad Firdaus",
    expiryWhen: "in 14 days",
    renewalForm: "kakisewa.com/ro/abc123xyz",
  },
  rent_reminder: {
    tenantName: "Ahmad Firdaus",
    amount: "2,500.00",
    propertyName: "Agile Mont Kiara",
    uploadUrl: "kakisewa.com/upload/abc123xyz",
  },
};

function renderWAHtml(template: string, vars: Record<string, string>): string {
  let html = template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `[${k}]`);
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  html = html.replace(/~([^~\n]+)~/g, "<del>$1</del>");
  html = html.replace(
    /(https?:\/\/[^\s<]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s<]*)/g,
    '<span style="color:#008069;text-decoration:underline">$1</span>'
  );
  html = html.replace(/\n/g, "<br>");
  return html;
}

function WhatsAppPreviewModal({
  spec,
  body,
  onClose,
}: {
  spec: TemplateSpec;
  body: string;
  onClose: () => void;
}) {
  const sampleVars = SAMPLE_VARS[spec.key as TemplateKey] ?? {};
  const html = renderWAHtml(body, sampleVars);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WA header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#008069" }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.22)", color: "#fff" }}
          >
            KK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-none" style={{ color: "#fff" }}>kakisewa</p>
            <p className="text-[11px] mt-0.5 opacity-70" style={{ color: "#fff" }}>preview</p>
          </div>
          <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-5 h-5" style={{ color: "#fff" }} />
          </button>
        </div>

        {/* Chat */}
        <div className="px-3 py-4" style={{ background: "#efeae2" }}>
          <div className="flex justify-end">
            <div
              className="relative max-w-[88%] rounded-tl-2xl rounded-tr-sm rounded-b-2xl px-3 pt-2 pb-6 shadow-sm"
              style={{ background: "#e9fbe6" }}
            >
              <p
                className="text-[13.5px] leading-[1.55]"
                style={{ color: "#111", wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <span className="absolute bottom-1.5 right-2.5 text-[10px]" style={{ color: "#8a9a85" }}>
                10:30 AM ✓✓
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 text-center" style={{ background: "#fff" }}>
          <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
            Sample values shown. Variables filled at send time.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  spec,
  value,
  isOpen,
  isCustomised,
  onChange,
  onToggle,
}: {
  spec: TemplateSpec;
  value: string;
  isOpen: boolean;
  isCustomised: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
}) {
  const { divRef, handleInput, handleKeyDown, handlePaste, insertPill } = useRichEditor(value, spec.variables, onChange);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      {showPreview && (
        <WhatsAppPreviewModal spec={spec} body={value} onClose={() => setShowPreview(false)} />
      )}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        {/* Header */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
          style={{ background: isOpen ? "var(--kk-surface-2)" : "transparent" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>
                {spec.label}
              </span>
              {isCustomised && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: "var(--kk-accent,#4f46e5)", color: "#fff" }}
                >
                  Edited
                </span>
              )}
            </div>
            <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--kk-ink-mute)" }}>
              {spec.description}
            </p>
          </div>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{
              color: "var(--kk-ink-mute)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Body */}
        {isOpen && (
          <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--kk-line)" }}>
            {/* Token chips */}
            <p className="text-[11px] mb-2" style={{ color: "var(--kk-ink-faint)" }}>
              Click to insert at cursor:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {spec.variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertPill(v.key)}
                  title={v.description}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all active:scale-95"
                  style={{
                    background: "var(--kk-accent,#4f46e5)",
                    color: "#fff",
                    opacity: 0.85,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                >
                  + {tokenLabel(v.key)}
                </button>
              ))}
            </div>

            {/* Contenteditable editor */}
            <div
              ref={divRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onPaste={handlePaste}
              className="w-full rounded-lg p-3 text-[13px] leading-[1.65] focus:outline-none"
              style={{
                background: "var(--kk-surface-2)",
                border: "1px solid var(--kk-line)",
                color: "var(--kk-ink)",
                minHeight: 140,
                maxHeight: 320,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            />

            {/* Actions */}
            <div className="flex items-center justify-between mt-2">
              <div>
                {isCustomised && (
                  <button
                    type="button"
                    onClick={() => onChange(spec.defaultBody)}
                    className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70"
                    style={{ color: "var(--kk-ink-mute)" }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to default
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{
                  background: "var(--kk-surface-2)",
                  border: "1px solid var(--kk-line)",
                  color: "var(--kk-ink-mute)",
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function AccountSettingsForm({ agent }: { agent: AgentProfile }) {
  const [name, setName] = useState(agent.name ?? "");
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [agency, setAgency] = useState(agent.agency ?? "");
  const [pending, startTransition] = useTransition();

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwPending, setPwPending] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setPwPending(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwPending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setNewPassword("");
    setConfirmPassword("");
  }

  const dirty =
    name !== (agent.name ?? "") ||
    phone !== (agent.phone ?? "") ||
    agency !== (agent.agency ?? "");

  function handleSave() {
    startTransition(async () => {
      const res = await saveProfileDetails({ name: name.trim(), phone: phone.trim(), agency: agency.trim() });
      if (res.ok) toast.success("Profile saved");
      else toast.error("Failed to save");
    });
  }

  // Templates
  const storedOverrides = parseTemplateOverrides(agent.whatsapp_templates);
  const VISIBLE = TEMPLATE_SPECS.filter(
    (s) => s.key !== "owner_outreach_initial" && s.key !== "owner_outreach_followup"
  );
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TEMPLATE_SPECS.map((s) => [s.key, storedOverrides[s.key as TemplateKey] ?? s.defaultBody])
    )
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tplPending, startTplTx] = useTransition();

  const tplDirty = VISIBLE.some((s) => {
    const stored = storedOverrides[s.key as TemplateKey] ?? s.defaultBody;
    return bodies[s.key] !== stored;
  });

  function handleSaveTemplates() {
    startTplTx(async () => {
      const overrides: TemplateOverrides = {};
      for (const spec of TEMPLATE_SPECS) {
        if (bodies[spec.key] !== spec.defaultBody) {
          overrides[spec.key as TemplateKey] = bodies[spec.key];
        }
      }
      const res = await saveWhatsAppTemplatesAction(overrides);
      if (res.ok) toast.success("Templates saved");
      else toast.error("Failed to save");
    });
  }

  return (
    <div className="space-y-6 max-w-xl">

      {/* ── Profile ── */}
      <section className="kk-section p-6">
        <h2 className="text-[15px] font-semibold mb-5" style={{ color: "var(--kk-ink)" }}>Your profile</h2>
        <div className="space-y-4">
          <div>
            <p className="kk-overline mb-1.5">Full name</p>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Howard Ho" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">WhatsApp / phone</p>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 60107609699" style={INPUT_STYLE} />
            <p className="text-[11px] mt-1.5" style={{ color: "var(--kk-ink-faint)" }}>
              Used as the sender in WhatsApp message templates.
            </p>
          </div>
          <div>
            <p className="kk-overline mb-1.5">Agency / company</p>
            <input type="text" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. Wonders Property" style={INPUT_STYLE} />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={pending || !dirty}
          className="kk-pill mt-6 flex items-center gap-2"
          style={{
            background: dirty ? "var(--kk-ink)" : "var(--kk-surface-2)",
            color: dirty ? "#fff" : "var(--kk-ink-faint)",
            cursor: pending || !dirty ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {pending ? "Saving…" : "Save profile"}
        </button>
      </section>

      {/* ── WhatsApp Templates ── */}
      <section className="kk-section p-6" style={{ overflow: "visible" }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>WhatsApp Templates</h2>
          <div className="relative group" style={{ overflow: "visible" }}>
            <Info className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--kk-ink-faint)" }} />
            <div
              className="absolute left-0 top-full mt-2 w-64 rounded-xl px-3 py-2.5 text-left pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "var(--kk-ink)", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.22)" }}
            >
              <div className="absolute left-3 bottom-full w-2 h-2 rotate-45" style={{ background: "var(--kk-ink)", marginBottom: -4 }} />
              <p className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wide">Formatting guide</p>
              <div className="space-y-1 text-[12px] leading-relaxed">
                <p><span className="opacity-50">Tokens:</span> {"{{variableName}}"} → replaced at send time</p>
                <p><span className="opacity-50">Bold:</span> *word* → <strong>word</strong></p>
                <p><span className="opacity-50">Italic:</span> _word_ → <em>word</em></p>
                <p><span className="opacity-50">Strike:</span> ~word~ → <del>word</del></p>
                <p><span className="opacity-50">Link:</span> paste a URL — shown as blue underline</p>
                <p><span className="opacity-50">Line break:</span> press Enter as normal</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
          Customize messages sent to owners and tenants. Click a token to insert it at your cursor.
        </p>

        <div className="space-y-2">
          {VISIBLE.map((spec) => (
            <TemplateCard
              key={spec.key}
              spec={spec}
              value={bodies[spec.key]}
              isOpen={openKey === spec.key}
              isCustomised={bodies[spec.key] !== spec.defaultBody}
              onChange={(v) => setBodies((prev) => ({ ...prev, [spec.key]: v }))}
              onToggle={() => setOpenKey(openKey === spec.key ? null : spec.key)}
            />
          ))}
        </div>

        <button
          onClick={handleSaveTemplates}
          disabled={tplPending || !tplDirty}
          className="kk-pill mt-5 flex items-center gap-2"
          style={{
            background: tplDirty ? "var(--kk-ink)" : "var(--kk-surface-2)",
            color: tplDirty ? "#fff" : "var(--kk-ink-faint)",
            cursor: tplPending || !tplDirty ? "not-allowed" : "pointer",
            opacity: tplPending ? 0.7 : 1,
          }}
        >
          {tplPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {tplPending ? "Saving…" : "Save templates"}
        </button>
      </section>

      {/* ── Change Password ── */}
      <section className="kk-section p-6">
        <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--kk-ink)" }}>Change password</h2>
        <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>Set a new password for your account.</p>
        <div className="space-y-3">
          <div>
            <p className="kk-overline mb-1.5">New password</p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={{ ...INPUT_STYLE }}
            />
          </div>
          <div>
            <p className="kk-overline mb-1.5">Confirm new password</p>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder=""
              style={{ ...INPUT_STYLE }}
            />
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={pwPending || !newPassword || !confirmPassword}
          className="kk-pill mt-5 flex items-center gap-2"
          style={{
            background: newPassword && confirmPassword ? "var(--kk-ink)" : "var(--kk-surface-2)",
            color: newPassword && confirmPassword ? "#fff" : "var(--kk-ink-faint)",
            cursor: pwPending || !newPassword || !confirmPassword ? "not-allowed" : "pointer",
            opacity: pwPending ? 0.7 : 1,
          }}
        >
          {pwPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {pwPending ? "Updating…" : "Update password"}
        </button>
      </section>

    </div>
  );
}
