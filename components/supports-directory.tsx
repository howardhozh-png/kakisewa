"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Trash2, X, Check, Loader2, Search } from "lucide-react";
import { PropertySupport, SupportType, SUPPORT_TYPES, SUPPORT_LABELS, SUPPORT_ICONS } from "@/lib/types";
import { savePropertySupport, toggleSupportStar, removeSupportContact } from "@/lib/actions";
import { resolveTemplate, parseTemplateOverrides, type TemplateOverrides } from "@/lib/whatsapp-templates";
import { normalizePhone } from "@/lib/phone";
import { INPUT_STYLE } from "@/lib/styles";
import { toast } from "sonner";

interface Props {
  initialContacts: PropertySupport[];
  whatsappTemplates?: string | null;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<SupportType, string> = {
  aircon:          "#0071E3",
  plumber:         "#32ADE6",
  electrician:     "#FF9F0A",
  cleaner:         "#30D158",
  locksmith:       "#BF5AF2",
  pest_control:    "#FF453A",
  renovation:      "#FF6B35",
  interior_design: "#FF375F",
  wifi:            "#5E5CE6",
  stamping:        "#98989D",
  other:           "#636366",
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function Avatar({ name, type, size = 40, light = false }: { name: string; type: SupportType; size?: number; light?: boolean }) {
  const bg = light ? "rgba(255,255,255,0.25)" : TYPE_COLORS[type];
  const border = light ? "1.5px solid rgba(255,255,255,0.4)" : "none";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, border, color: "white",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.33, letterSpacing: "-0.5px",
      flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTypes(c: PropertySupport): SupportType[] {
  if (c.types?.length) return c.types;
  return c.type ? [c.type] : ["other"];
}

function getContactPriority(c: PropertySupport): 0 | 1 | 2 | 3 {
  if (c.starred && c.source === "seed") return 0;
  if (c.starred && c.source !== "seed") return 1;
  if (!c.starred && c.source === "seed") return 2;
  return 3;
}

function buildShareUrl(c: PropertySupport, templateOverrides: TemplateOverrides): string {
  const types = getTypes(c);
  const typeLabels = types.map(t => SUPPORT_LABELS[t]).join(", ");
  const cleanPhone = normalizePhone(c.phone);
  const message = resolveTemplate("service_contact_share", templateOverrides, {
    contactType: typeLabels,
    contactName: c.name,
    contactPhone: cleanPhone,
    contactAreaLine: c.area ? `\nArea: ${c.area}` : "",
    contactNotesLine: c.notes ? `\nNote: ${c.notes}` : "",
  });
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ── WhatsApp share button ─────────────────────────────────────────────────────
function WaButton({ shareUrl }: { shareUrl: string }) {
  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, background: "var(--kk-whatsapp)", color: "white",
        borderRadius: 10, padding: "7px 12px",
        fontSize: 12, fontWeight: 600, textDecoration: "none",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5.227-1.323C8.87 21.536 10.407 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z" fill="none" stroke="white" strokeWidth="1.5"/>
      </svg>
      Share contact
    </a>
  );
}

// ── Type chips (secondary badges on card body) ────────────────────────────────
function TypeChips({ types, primaryType, light = false }: { types: SupportType[]; primaryType: SupportType; light?: boolean }) {
  const secondary = types.filter(t => t !== primaryType);
  if (!secondary.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {secondary.map(t => (
        <span key={t} style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 7px", borderRadius: 6,
          fontSize: 10, fontWeight: 600,
          background: light ? "rgba(255,255,255,0.2)" : "var(--kk-surface-2)",
          color: light ? "rgba(255,255,255,0.85)" : "var(--kk-ink-mute)",
        }}>
          {SUPPORT_ICONS[t]} {SUPPORT_LABELS[t]}
        </span>
      ))}
    </div>
  );
}

// ── Card for starred+recommended (seed + starred) ─────────────────────────────
function StarredRecCard({ contact, primaryType, onStar, shareUrl }: {
  contact: PropertySupport;
  primaryType: SupportType;
  onStar: (c: PropertySupport) => void;
  shareUrl: string;
}) {
  return (
    <div style={{
      borderRadius: 16,
      border: "1.5px solid rgba(255,204,0,0.45)",
      boxShadow: "0 0 0 3px rgba(255,204,0,0.10), 0 4px 16px rgba(0,113,227,0.12)",
      overflow: "hidden",
    }}>
      <div style={{ background: "linear-gradient(135deg, #0060C7 0%, #0084FF 60%, #34AAFF 100%)", padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 5, padding: "1px 6px",
            fontSize: 9, fontWeight: 700, color: "white",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>✦ Recommended</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "rgba(255,204,0,0.25)", border: "1px solid rgba(255,204,0,0.5)",
            borderRadius: 5, padding: "1px 6px",
            fontSize: 9, fontWeight: 700, color: "#FFD700",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>⭐ Starred</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
          <Avatar name={contact.name} type={primaryType} size={38} light />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1.3, marginBottom: 1 }}>
              {contact.name}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              {contact.contact_name ? `${contact.contact_name} · ${contact.phone}` : contact.phone}
            </p>
            <TypeChips types={getTypes(contact)} primaryType={primaryType} light />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onStar(contact); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 3, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
            ⭐
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 12px 12px", background: "var(--kk-surface)" }}>
        {contact.area && (
          <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginBottom: 8 }}>📍 {contact.area}</p>
        )}
        <WaButton shareUrl={shareUrl} />
      </div>
    </div>
  );
}

// ── Card for recommended (seed unstarred) ─────────────────────────────────────
function RecommendedCard({ contact, primaryType, onStar, shareUrl }: {
  contact: PropertySupport;
  primaryType: SupportType;
  onStar: (c: PropertySupport) => void;
  shareUrl: string;
}) {
  return (
    <div style={{
      background: "var(--kk-surface)",
      borderRadius: 16,
      border: "1.5px solid #C5DCFF",
      boxShadow: "0 4px 16px rgba(0,113,227,0.10)",
      overflow: "hidden",
    }}>
      <div style={{ background: "linear-gradient(135deg, #0060C7 0%, #0084FF 60%, #34AAFF 100%)", padding: "10px 12px 12px" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 5, padding: "1px 6px",
            fontSize: 9, fontWeight: 700, color: "white",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>✦ Recommended</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
          <Avatar name={contact.name} type={primaryType} size={38} light />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1.3, marginBottom: 1 }}>
              {contact.name}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              {contact.contact_name ? `${contact.contact_name} · ${contact.phone}` : contact.phone}
            </p>
            <TypeChips types={getTypes(contact)} primaryType={primaryType} light />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onStar(contact); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 3, fontSize: 16, lineHeight: 1, flexShrink: 0, color: "white" }}>
            ☆
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        {contact.area && (
          <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginBottom: 8 }}>📍 {contact.area}</p>
        )}
        <WaButton shareUrl={shareUrl} />
      </div>
    </div>
  );
}

// ── Card for custom contacts ──────────────────────────────────────────────────
function RegularCard({ contact, primaryType, onEdit, onDelete, onStar, shareUrl }: {
  contact: PropertySupport;
  primaryType: SupportType;
  onEdit: (c: PropertySupport) => void;
  onDelete: (c: PropertySupport) => void;
  onStar: (c: PropertySupport) => void;
  shareUrl: string;
}) {
  const isStarred = !!contact.starred;
  return (
    <div style={{
      background: "var(--kk-surface)",
      borderRadius: 16,
      border: isStarred ? "1.5px solid rgba(255,204,0,0.6)" : "1px solid var(--kk-line)",
      boxShadow: isStarred
        ? "0 0 0 3px rgba(255,204,0,0.12), 0 3px 12px rgba(0,0,0,0.06)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Avatar name={contact.name} type={primaryType} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.3, marginBottom: 1 }}>
              {contact.name}
            </p>
            <p style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>
              {contact.contact_name ? `${contact.contact_name} · ${contact.phone}` : contact.phone}
            </p>
            <TypeChips types={getTypes(contact)} primaryType={primaryType} />
            {contact.area && (
              <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginTop: 3 }}>📍 {contact.area}</p>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onStar(contact); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 3, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
            {isStarred ? "⭐" : "☆"}
          </button>
        </div>
        <div style={{ borderTop: "1px solid var(--kk-line)", margin: "10px 0 9px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <WaButton shareUrl={shareUrl} />
          <button onClick={(e) => { e.stopPropagation(); onEdit(contact); }}
            style={{ background: "var(--kk-surface-2)", border: "none", borderRadius: 10, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--kk-ink-mute)" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {contact.source !== "seed" && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(contact); }}
              style={{ background: "var(--kk-surface-2)", border: "none", borderRadius: 10, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Trash2 style={{ width: 13, height: 13, color: "var(--kk-red)" }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit / Add form ───────────────────────────────────────────────────────────

function ContactForm({ initial, onClose, onSaved }: {
  initial?: PropertySupport | null;
  onClose: () => void;
  onSaved: (c: PropertySupport) => void;
}) {
  const initialTypes: SupportType[] = initial?.types?.length ? initial.types : (initial?.type ? [initial.type] : ["other"]);
  const [name, setName]               = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [phone, setPhone]             = useState(initial?.phone ?? "");
  const [types, setTypes]             = useState<SupportType[]>(initialTypes);
  const [area, setArea]               = useState(initial?.area ?? "");
  const [notes, setNotes]             = useState(initial?.notes ?? "");
  const [pending, startTransition]    = useTransition();

  function toggleType(t: SupportType) {
    setTypes(prev => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter(x => x !== t);
      return [...prev, t];
    });
  }

  function submit() {
    if (!name.trim() || !phone.trim() || types.length === 0) return;
    startTransition(async () => {
      const res = await savePropertySupport({
        id: initial?.id,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim(),
        type: types[0],
        types,
        area: area.trim() || null,
        notes: notes.trim() || null,
        starred: initial?.starred ?? 0,
      });
      if (res.ok) {
        toast.success(initial ? "Contact updated" : "Contact added");
        onSaved({
          id: initial?.id ?? `sup_${Date.now()}`,
          name: name.trim(),
          contact_name: contactName.trim() || null,
          phone: phone.trim(),
          type: types[0], types,
          area: area.trim() || null,
          notes: notes.trim() || null,
          starred: initial?.starred ?? 0,
          source: initial?.source ?? "custom",
          created_at: initial?.created_at ?? new Date().toISOString(),
        });
        onClose();
      } else {
        toast.error("Could not save contact");
      }
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 460, border: "1px solid var(--kk-line)" }}>
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: "var(--kk-line)" }}>
          <div>
            <p className="kk-overline mb-0.5">Services directory</p>
            <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              {initial ? "Edit contact" : "Add contact"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <div>
            <p className="kk-overline mb-2">
              Service type{" "}
              <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(select all that apply)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORT_TYPES.map((t) => {
                const active = types.includes(t);
                return (
                  <button key={t} onClick={() => toggleType(t)}
                    className="kk-toggle-pill px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: active ? "var(--kk-ink)" : "var(--kk-surface-2)", color: active ? "#fff" : "var(--kk-ink-mute)" }}>
                    {SUPPORT_ICONS[t]} {SUPPORT_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="kk-overline mb-1.5">Business / Company name</p>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmad Plumbing Services" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">Contact person <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></p>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Ahmad, Uncle Chong" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">Phone (WhatsApp)</p>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 60123456789" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">Area covered</p>
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. KL, Ampang, Cheras" style={INPUT_STYLE} />
          </div>
          <div>
            <p className="kk-overline mb-1.5">Notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fast response, RM80 call-out fee" rows={2}
              style={{ ...INPUT_STYLE, resize: "none", lineHeight: "1.6" }} />
          </div>
          <button onClick={submit} disabled={pending || !name.trim() || !phone.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
            style={{ background: name.trim() && phone.trim() ? "var(--kk-ink)" : "var(--kk-surface-2)", color: name.trim() && phone.trim() ? "#fff" : "var(--kk-ink-faint)" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {pending ? "Saving..." : initial ? "Save changes" : "Add contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ contact, onCancel, onConfirmed }: {
  contact: PropertySupport;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function confirm() {
    startTransition(async () => {
      const res = await removeSupportContact(contact.id);
      if (res.ok) { toast.success("Contact removed"); onConfirmed(); }
      else toast.error("Could not remove contact");
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="w-full bg-white rounded-3xl shadow-2xl p-6"
        style={{ maxWidth: 380, border: "1px solid var(--kk-line)" }}>
        <p className="text-[17px] font-semibold mb-1" style={{ color: "var(--kk-ink)" }}>Remove contact?</p>
        <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
          <strong>{contact.name}</strong> will be removed from your directory.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>Cancel</button>
          <button onClick={confirm} disabled={pending} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: "#DC2626", color: "#fff" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main directory ────────────────────────────────────────────────────────────
export function SupportsDirectory({ initialContacts, whatsappTemplates }: Props) {
  const templateOverrides = useMemo(() => parseTemplateOverrides(whatsappTemplates), [whatsappTemplates]);
  const [contacts, setContacts]         = useState<PropertySupport[]>(initialContacts);
  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState<SupportType | "all" | "starred">("all");
  const [editTarget, setEditTarget]     = useState<PropertySupport | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertySupport | null>(null);
  const [, startTransition]             = useTransition();

  // Build type → sorted contacts map
  const typeGroups = useMemo(() => {
    const q = search.toLowerCase();
    const matches = (c: PropertySupport) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.contact_name ?? "").toLowerCase().includes(q) ||
        (c.area ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    };

    // Build map: type → contacts with that type
    const groups = new Map<SupportType, PropertySupport[]>();
    for (const c of contacts) {
      if (!matches(c)) continue;
      if (filterType === "starred" && !c.starred) continue;
      if (filterType !== "all" && filterType !== "starred" && !getTypes(c).includes(filterType as SupportType)) continue;

      const types = getTypes(c);
      // When a specific type filter is active, only put the contact in that one bucket
      // (not all its types), so the Electrician filter doesn't also show Plumber sections
      const bucketsToAdd = (filterType !== "all" && filterType !== "starred")
        ? [filterType as SupportType]
        : types;
      for (const t of bucketsToAdd) {
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t)!.push(c);
      }
    }

    // Sort contacts within each group by priority
    for (const [, arr] of groups) {
      arr.sort((a, b) => getContactPriority(a) - getContactPriority(b));
    }

    // Return in SUPPORT_TYPES order, only non-empty groups
    return SUPPORT_TYPES
      .filter(t => groups.has(t))
      .map(t => ({ type: t, contacts: groups.get(t)! }));
  }, [contacts, search, filterType]);

  const totalVisible = typeGroups.reduce((acc, g) => acc + g.contacts.length, 0);
  // Count unique contacts (a contact can appear in multiple type groups)
  const uniqueVisible = useMemo(() => {
    const ids = new Set<string>();
    for (const g of typeGroups) for (const c of g.contacts) ids.add(c.id);
    return ids.size;
  }, [typeGroups]);

  const hasStarred = contacts.some(c => c.starred);
  const hasType    = (t: SupportType) => contacts.some(c => getTypes(c).includes(t));

  function handleStar(c: PropertySupport) {
    const next = c.starred ? 0 : 1;
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, starred: next } : x));
    startTransition(async () => {
      const res = await toggleSupportStar(c.id, next);
      if (!res.ok) {
        setContacts(prev => prev.map(x => x.id === c.id ? { ...x, starred: c.starred } : x));
        toast.error("Could not update star");
      }
    });
  }

  function handleSaved(updated: PropertySupport) {
    setContacts(prev => {
      const exists = prev.find(x => x.id === updated.id);
      if (exists) return prev.map(x => x.id === updated.id ? updated : x);
      return [...prev, updated];
    });
  }

  function handleDeleted(c: PropertySupport) {
    setContacts(prev => prev.filter(x => x.id !== c.id));
    setDeleteTarget(null);
  }

  function renderCard(c: PropertySupport, primaryType: SupportType) {
    const priority = getContactPriority(c);
    const shareUrl = buildShareUrl(c, templateOverrides);
    if (priority === 0) return <StarredRecCard key={`${c.id}-${primaryType}`} contact={c} primaryType={primaryType} onStar={handleStar} shareUrl={shareUrl} />;
    if (priority === 2) return <RecommendedCard key={`${c.id}-${primaryType}`} contact={c} primaryType={primaryType} onStar={handleStar} shareUrl={shareUrl} />;
    return <RegularCard key={`${c.id}-${primaryType}`} contact={c} primaryType={primaryType} onEdit={setEditTarget} onDelete={setDeleteTarget} onStar={handleStar} shareUrl={shareUrl} />;
  }

  return (
    <>
      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, person, or area..."
            className="w-full pl-9 pr-4 py-1.5 rounded-full text-[13px] outline-none"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(["all", "starred", ...SUPPORT_TYPES] as const).map((t) => {
            if (t !== "all" && t !== "starred" && !hasType(t as SupportType)) return null;
            if (t === "starred" && !hasStarred) return null;
            const isActive   = filterType === t;
            const isStarPill = t === "starred";
            const label = t === "all" ? "All"
              : t === "starred" ? "⭐ Starred"
              : `${SUPPORT_ICONS[t as SupportType]} ${SUPPORT_LABELS[t as SupportType]}`;
            return (
              <button key={t} onClick={() => setFilterType(isActive && t !== "all" ? "all" : t)}
                className="kk-toggle-pill px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0"
                style={{
                  background: isStarPill && isActive ? "rgba(254,243,199,0.9)"
                    : isStarPill ? "rgba(254,249,231,0.7)"
                    : isActive ? "var(--kk-ink)" : "var(--kk-surface-2)",
                  color: isStarPill ? "#92400E" : isActive ? "#fff" : "var(--kk-ink-mute)",
                  border: isStarPill ? "1.5px solid rgba(217,119,6,0.35)" : "1px solid transparent",
                  fontWeight: isStarPill ? 600 : undefined,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {uniqueVisible === 0 ? (
        <div className="kk-section flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-[17px] font-semibold" style={{ color: "var(--kk-ink)" }}>No contacts found</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            {search ? "Try a different search term" : "Add your first contact to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {typeGroups.map(({ type, contacts: groupContacts }) => (
            <section key={type}>
              {/* Type section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: TYPE_COLORS[type] + "18",
                  border: `1px solid ${TYPE_COLORS[type]}30`,
                  borderRadius: 8, padding: "4px 10px",
                  fontSize: 12, fontWeight: 700, color: TYPE_COLORS[type],
                }}>
                  {SUPPORT_ICONS[type]} {SUPPORT_LABELS[type]}
                </span>
                <span style={{
                  background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)",
                  fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                }}>
                  {groupContacts.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupContacts.map(c => renderCard(c, type))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editTarget !== null && (
        <ContactForm initial={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}
      {deleteTarget && (
        <DeleteConfirm contact={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirmed={() => handleDeleted(deleteTarget)} />
      )}
    </>
  );
}
