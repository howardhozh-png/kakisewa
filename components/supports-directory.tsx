"use client";

import { useState, useTransition, useMemo } from "react";
import { Star, Pencil, Trash2, Share2, X, Check, Loader2, Search } from "lucide-react";
import { PropertySupport, SupportType, SUPPORT_TYPES, SUPPORT_LABELS, SUPPORT_ICONS } from "@/lib/types";
import { savePropertySupport, toggleSupportStar, removeSupportContact } from "@/lib/actions";
import { toast } from "sonner";

interface Props {
  initialContacts: PropertySupport[];
}

// ── Share via WhatsApp ────────────────────────────────────────────────────────
function shareContact(c: PropertySupport) {
  const label = SUPPORT_LABELS[c.type];
  const phone = c.phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hi! Here's a trusted ${label} I recommend:\n\n*${c.name}*\nTel: +${phone}${c.area ? `\nArea: ${c.area}` : ""}${c.notes ? `\nNote: ${c.notes}` : ""}\n\nFeel free to contact them directly 🙂`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none select-none z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100"
        style={{ background: "var(--kk-ink)", color: "#fff" }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────
function ContactCard({
  contact,
  onEdit,
  onDelete,
  onStar,
}: {
  contact: PropertySupport;
  onEdit: (c: PropertySupport) => void;
  onDelete: (c: PropertySupport) => void;
  onStar: (c: PropertySupport) => void;
}) {
  const phone = contact.phone.replace(/\D/g, "");

  const preferred = !!contact.starred;

  return (
    <div
      className="kk-card-hover p-4 flex items-start gap-3 group relative"
      style={{
        background: "var(--kk-surface)",
        border: preferred ? "2px solid rgba(217,119,6,0.40)" : "1px solid var(--kk-line)",
        borderRadius: 18,
        boxShadow: preferred
          ? "0 0 0 4px rgba(245,158,11,0.10), 0 4px 12px -2px rgba(0,0,0,0.07)"
          : "0 4px 12px -2px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
      }}
    >
      {/* Preferred badge — fades out on hover to reveal action buttons */}
      {preferred && (
        <span
          className="absolute top-0 right-0 text-[10px] font-bold px-2.5 py-1 rounded-bl-2xl pointer-events-none group-hover:opacity-0 transition-opacity duration-150"
          style={{ background: "rgba(254,243,199,0.95)", color: "#92400E", zIndex: 10, border: "1px solid rgba(217,119,6,0.25)", borderTop: "none", borderRight: "none", borderTopRightRadius: 16 }}
        >
          ⭐ Preferred
        </span>
      )}

      {/* Action buttons — absolute top-right, swap in on hover */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ zIndex: 20 }}
      >
        <Tip label={contact.starred ? "Unstar" : "Star"}>
          <button
            onClick={() => onStar(contact)}
            className="kk-icon-btn w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: contact.starred ? "rgba(245,158,11,0.15)" : "var(--kk-surface-2)",
              color: contact.starred ? "#D97706" : "var(--kk-ink-faint)",
            }}
          >
            <Star className="w-3.5 h-3.5" style={{ fill: contact.starred ? "currentColor" : "none" }} />
          </button>
        </Tip>
        <Tip label="Share via WhatsApp">
          <button
            onClick={() => shareContact(contact)}
            className="kk-icon-btn w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <Tip label="Edit">
          <button
            onClick={() => onEdit(contact)}
            className="kk-icon-btn w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <Tip label="Delete">
          <button
            onClick={() => onDelete(contact)}
            className="kk-icon-btn w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Tip>
      </div>

      {/* Type icon — aligns with name since info starts with the name directly */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[18px]"
        style={{ background: preferred ? "rgba(245,158,11,0.12)" : "var(--kk-surface-2)" }}
      >
        {SUPPORT_ICONS[contact.type]}
      </div>

      {/* Info — pr-24 so text never runs under the button/badge area */}
      <div className="flex-1 min-w-0 pr-24">
        <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>
          {contact.name}
        </p>
        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-medium hover:underline"
          style={{ color: "var(--kk-accent)" }}
        >
          {contact.phone}
        </a>

        {contact.area && (
          <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
            📍 {contact.area}
          </p>
        )}
        {contact.notes && (
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            {contact.notes}
          </p>
        )}

        {contact.source === "seed" && (
          <span
            className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}
          >
            Suggested
          </span>
        )}
      </div>
    </div>
  );
}

// ── Edit / Add panel ──────────────────────────────────────────────────────────
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

function ContactForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PropertySupport | null;
  onClose: () => void;
  onSaved: (c: PropertySupport) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [type, setType] = useState<SupportType>(initial?.type ?? "other");
  const [area, setArea] = useState(initial?.area ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || !phone.trim()) return;
    startTransition(async () => {
      const res = await savePropertySupport({
        id: initial?.id,
        name: name.trim(),
        phone: phone.trim(),
        type,
        area: area.trim() || null,
        notes: notes.trim() || null,
        starred: initial?.starred ?? 0,
      });
      if (res.ok) {
        toast.success(initial ? "Contact updated" : "Contact added");
        onSaved({
          id: initial?.id ?? `sup_${Date.now()}`,
          name: name.trim(), phone: phone.trim(), type,
          area: area.trim() || null, notes: notes.trim() || null,
          starred: initial?.starred ?? 0, source: initial?.source ?? "custom",
          created_at: initial?.created_at ?? new Date().toISOString(),
        });
        onClose();
      } else {
        toast.error("Could not save contact");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 460, border: "1px solid var(--kk-line)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: "var(--kk-line)" }}>
          <div>
            <p className="kk-overline mb-0.5">Property supports</p>
            <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              {initial ? "Edit contact" : "Add contact"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <p className="kk-overline mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="kk-toggle-pill px-3 py-1.5 rounded-full text-[12px] font-medium"
                  style={{
                    background: type === t ? "var(--kk-ink)" : "var(--kk-surface-2)",
                    color: type === t ? "#fff" : "var(--kk-ink-mute)",
                  }}
                >
                  {SUPPORT_ICONS[t]} {SUPPORT_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="kk-overline mb-1.5">Name</p>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmad Plumbing Services" style={INPUT_STYLE} />
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fast response, RM80 call-out fee"
              rows={2}
              style={{ ...INPUT_STYLE, resize: "none", lineHeight: "1.6" }}
            />
          </div>

          <button
            onClick={submit}
            disabled={pending || !name.trim() || !phone.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: name.trim() && phone.trim() ? "var(--kk-ink)" : "var(--kk-surface-2)",
              color: name.trim() && phone.trim() ? "#fff" : "var(--kk-ink-faint)",
            }}
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {pending ? "Saving…" : initial ? "Save changes" : "Add contact"}
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

  function confirm() {
    startTransition(async () => {
      const res = await removeSupportContact(contact.id);
      if (res.ok) { toast.success("Contact removed"); onConfirmed(); }
      else toast.error("Could not remove contact");
    });
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full bg-white rounded-3xl shadow-2xl p-6"
        style={{ maxWidth: 380, border: "1px solid var(--kk-line)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-[17px] font-semibold mb-1" style={{ color: "var(--kk-ink)" }}>Remove contact?</p>
        <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
          <strong>{contact.name}</strong> will be removed from your directory. Suggested contacts can be re-added anytime.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={pending} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold" style={{ background: "#DC2626", color: "#fff" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main directory ────────────────────────────────────────────────────────────
export function SupportsDirectory({ initialContacts }: Props) {
  const [contacts, setContacts] = useState<PropertySupport[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<SupportType | "all" | "starred">("all");
  const [editTarget, setEditTarget] = useState<PropertySupport | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertySupport | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      if (filterType === "starred" && !c.starred) return false;
      if (filterType !== "all" && filterType !== "starred" && c.type !== filterType) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.area ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
  }, [contacts, search, filterType]);

  // Group by type, starred first within each group
  const grouped = useMemo(() => {
    const order = SUPPORT_TYPES.filter((t) => filtered.some((c) => c.type === t));
    return order.map((type) => ({
      type,
      items: filtered
        .filter((c) => c.type === type)
        .sort((a, b) => b.starred - a.starred),
    }));
  }, [filtered]);

  function handleStar(c: PropertySupport) {
    const next = c.starred ? 0 : 1;
    setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, starred: next } : x));
    startTransition(async () => {
      const res = await toggleSupportStar(c.id, next);
      if (!res.ok) {
        setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, starred: c.starred } : x));
        toast.error("Could not update star");
      }
    });
  }

  function handleSaved(updated: PropertySupport) {
    setContacts((prev) => {
      const exists = prev.find((x) => x.id === updated.id);
      if (exists) return prev.map((x) => x.id === updated.id ? updated : x);
      return [...prev, updated];
    });
  }

  function handleDeleted(c: PropertySupport) {
    setContacts((prev) => prev.filter((x) => x.id !== c.id));
    setDeleteTarget(null);
  }

  const starredCount = contacts.filter((c) => c.starred).length;

  return (
    <>
      {/* Search + filter */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, area, or notes…"
            className="w-full pl-9 pr-4 py-1.5 rounded-full text-[13px] outline-none"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(["all", "starred", ...SUPPORT_TYPES] as const).map((t) => {
            if (t !== "all" && t !== "starred") {
              if (!contacts.some((c) => c.type === t)) return null;
            }
            if (t === "starred" && !contacts.some((c) => c.starred)) return null;
            const isActive = filterType === t;
            const label = t === "all" ? "All" : t === "starred" ? "⭐ Preferred" : `${SUPPORT_ICONS[t]} ${SUPPORT_LABELS[t]}`;
            const isPreferred = t === "starred";
            return (
              <button
                key={t}
                onClick={() => setFilterType(isActive && t !== "all" ? "all" : t)}
                className="kk-toggle-pill px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0"
                style={{
                  background: isPreferred && isActive ? "rgba(254,243,199,0.9)" : isPreferred ? "rgba(254,249,231,0.7)" : isActive ? "var(--kk-ink)" : "var(--kk-surface-2)",
                  color: isPreferred ? "#92400E" : isActive ? "#fff" : "var(--kk-ink-mute)",
                  border: isPreferred ? "1.5px solid rgba(217,119,6,0.35)" : "1px solid transparent",
                  fontWeight: isPreferred ? 600 : undefined,
                  boxShadow: isPreferred && isActive ? "0 0 0 3px rgba(245,158,11,0.12)" : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped directory */}
      {grouped.length === 0 ? (
        <div className="kk-section flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-[17px] font-semibold" style={{ color: "var(--kk-ink)" }}>No contacts found</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            {search ? "Try a different search term" : "Add your first contact to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ type, items }) => (
            <section key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[18px]">{SUPPORT_ICONS[type]}</span>
                <p className="kk-overline">{SUPPORT_LABELS[type]}</p>
                <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    onStar={handleStar}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add / Edit panel */}
      {editTarget !== null && (
        <ContactForm
          initial={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          contact={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirmed={() => handleDeleted(deleteTarget)}
        />
      )}
    </>
  );
}
