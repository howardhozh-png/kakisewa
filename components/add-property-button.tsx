"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, X, Loader2 } from "lucide-react";
import { addOwnerLeadAction } from "@/lib/actions";
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

export function DirectoryAddButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [unit, setUnit] = useState("");
  const [expectedRent, setExpectedRent] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setOwnerName(""); setOwnerPhone(""); setPropertyName(""); setUnit("");
    setExpectedRent(""); setBedrooms(""); setBathrooms(""); setNotes("");
  }

  function close() { reset(); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open]);

  function submit() {
    if (!ownerName.trim() || !ownerPhone.trim()) return;
    startTransition(async () => {
      const res = await addOwnerLeadAction({
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        property_name: propertyName.trim() || null,
        unit: unit.trim() || null,
        expected_rent: expectedRent ? parseFloat(expectedRent) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        toast.success("Property added");
        close();
        router.refresh();
      } else {
        toast.error(res.message ?? "Could not add property");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="kk-pill flex items-center gap-2 px-4 py-2"
        style={{
          fontSize: "13px",
          fontWeight: 500,
          background: "var(--kk-surface)",
          border: "1px solid var(--kk-line)",
          color: "var(--kk-ink-mute)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <Building2 className="w-4 h-4" />
        Add property
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="w-full rounded-3xl shadow-2xl overflow-hidden"
            style={{ maxWidth: 480, background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: "var(--kk-line)" }}>
              <div>
                <p className="kk-overline mb-0.5">New owner lead</p>
                <p className="text-[18px] font-semibold" style={{ color: "var(--kk-ink)" }}>Add property</p>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70dvh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <p className="kk-overline mb-1.5">Owner name <span style={{ color: "var(--kk-red)" }}>*</span></p>
                  <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Datin Rashidah" style={INPUT_STYLE} />
                </div>
                <div className="col-span-2">
                  <p className="kk-overline mb-1.5">Owner phone <span style={{ color: "var(--kk-red)" }}>*</span></p>
                  <input type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="e.g. 601XXXXXXXX" style={INPUT_STYLE} />
                </div>
                <div className="col-span-2">
                  <p className="kk-overline mb-1.5">Property name</p>
                  <input type="text" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="e.g. TRX Residences" style={INPUT_STYLE} />
                </div>
                <div>
                  <p className="kk-overline mb-1.5">Unit</p>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. C-2105" style={INPUT_STYLE} />
                </div>
                <div>
                  <p className="kk-overline mb-1.5">Expected rent (RM)</p>
                  <input type="number" value={expectedRent} onChange={(e) => setExpectedRent(e.target.value)} placeholder="e.g. 3500" min={0} style={INPUT_STYLE} />
                </div>
                <div>
                  <p className="kk-overline mb-1.5">Bedrooms</p>
                  <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="e.g. 3" min={0} style={INPUT_STYLE} />
                </div>
                <div>
                  <p className="kk-overline mb-1.5">Bathrooms</p>
                  <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="e.g. 2" min={0} style={INPUT_STYLE} />
                </div>
                <div className="col-span-2">
                  <p className="kk-overline mb-1.5">Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any details about this property or owner…"
                    rows={2}
                    style={{ ...INPUT_STYLE, resize: "none", lineHeight: "1.6" }}
                  />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={pending || !ownerName.trim() || !ownerPhone.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                style={{
                  background: ownerName.trim() && ownerPhone.trim() ? "var(--kk-ink)" : "var(--kk-surface-2)",
                  color: ownerName.trim() && ownerPhone.trim() ? "#fff" : "var(--kk-ink-faint)",
                }}
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? "Saving…" : "Add property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
