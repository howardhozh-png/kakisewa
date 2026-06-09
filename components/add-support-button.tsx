"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { PropertySupport, SupportType, SUPPORT_TYPES, SUPPORT_LABELS, SUPPORT_ICONS } from "@/lib/types";
import { savePropertySupport } from "@/lib/actions";
import { toast } from "sonner";

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

export function AddSupportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<SupportType>("other");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName(""); setPhone(""); setType("other"); setArea(""); setNotes("");
  }

  function close() { reset(); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open]);

  function submit() {
    if (!name.trim() || !phone.trim()) return;
    startTransition(async () => {
      const res = await savePropertySupport({
        name: name.trim(),
        phone: phone.trim(),
        type,
        area: area.trim() || null,
        notes: notes.trim() || null,
        starred: 0,
      });
      if (res.ok) {
        toast.success("Contact added");
        close();
        router.refresh();
      } else {
        toast.error("Could not save contact");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="kk-pill kk-pill-white flex items-center gap-2 px-4 py-2"
        style={{ fontSize: "13px", fontWeight: 500, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <Plus className="w-4 h-4" />
        Add contact
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            style={{ maxWidth: 460, border: "1px solid var(--kk-line)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: "var(--kk-line)" }}>
              <div>
                <p className="kk-overline mb-0.5">Property supports</p>
                <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Add contact</p>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
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
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))} placeholder="e.g. 60123456789" style={INPUT_STYLE} />
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
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? "Saving…" : "Add contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
