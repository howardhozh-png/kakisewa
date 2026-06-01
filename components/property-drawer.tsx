"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2, MapPin, Phone, ImagePlus, Trash2 } from "lucide-react";
import { Property } from "@/lib/types";
import { removeProperty } from "@/lib/actions";
import { UploadRing } from "@/components/ui/upload-ring";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";

interface Props {
  property: Property;
  tenantCount: number;
}

export function PropertyDrawer({ property: p, tenantCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>(p.photo_urls ?? []);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startTransition] = useTransition();

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 4) return;
    setUploadProgress(0);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const { ok, data } = await uploadWithProgress("/api/upload", fd, setUploadProgress);
      if (!ok) throw new Error("Upload failed");
      const next = [...photos, data.url as string];
      setPhotos(next);
      await fetch(`/api/properties/${p.id}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: next }),
      });
    } catch { /* ignore */ } finally {
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  async function removePhoto(url: string) {
    const next = photos.filter((u) => u !== url);
    setPhotos(next);
    await fetch(`/api/properties/${p.id}/photos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: next }),
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left focus:outline-none"
        aria-label={`Open details for ${p.name}`}
      >
        <PropertyCard property={p} tenantCount={tenantCount} />
      </button>

      {open && (
        <div
          className="drawer-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`drawer-panel flex flex-col ${open ? "open" : ""}`}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-6 border-b shrink-0"
          style={{ borderColor: "var(--kk-line)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[16px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.011em" }}>
                {p.name}
              </p>
              {p.unit && (
                <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Unit {p.unit}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-5">
            <DrawerRow icon={<MapPin className="w-4 h-4" />} label="Address" value={p.address} />
            <DrawerRow icon={<Phone className="w-4 h-4" />} label="Owner" value={`${p.owner_name} · +${p.owner_phone}`} />
            <DrawerRow icon={<Building2 className="w-4 h-4" />} label="Tenants" value={`${tenantCount} active`} />
          </div>

          {/* Photo vault */}
          <div>
            <p className="kk-overline mb-4">Photo vault · {photos.length}/4</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url) => (
                <div key={url} className="relative group rounded-xl overflow-hidden aspect-video" style={{ border: "1px solid var(--kk-line)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="property" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(url)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.95)", color: "var(--kk-red)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label
                  className="aspect-video rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  style={{
                    border: "1.5px dashed var(--kk-line-strong)",
                    background: "var(--kk-surface-2)",
                    color: uploadProgress !== null ? "var(--kk-ink)" : "var(--kk-ink-mute)",
                    pointerEvents: uploadProgress !== null ? "none" : undefined,
                  }}
                >
                  {uploadProgress !== null
                    ? <UploadRing progress={uploadProgress} size={44} />
                    : <ImagePlus className="w-5 h-5" />
                  }
                  {uploadProgress === null && <span className="text-[12px] font-medium">Add photo</span>}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadProgress !== null}
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="flex-1 text-[13px] font-medium" style={{ color: "#DC2626" }}>Delete this property permanently?</p>
              <button onClick={() => setConfirmDelete(false)} className="text-[12px] font-medium px-3 py-1.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
              <button disabled={deleting}
                onClick={() => startTransition(async () => { await removeProperty(p.id); setOpen(false); router.refresh(); })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={{ background: "#DC2626", color: "#fff" }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--kk-ink-faint)" }}>
              <Trash2 className="w-4 h-4" />
              Delete property
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 shrink-0" style={{ color: "var(--kk-ink-faint)" }}>{icon}</span>
      <div>
        <p className="kk-overline" style={{ color: "var(--kk-ink-faint)" }}>{label}</p>
        <p className="mt-1.5 text-[15px] font-medium" style={{ color: "var(--kk-ink)" }}>{value}</p>
      </div>
    </div>
  );
}

function PropertyCard({ property: p, tenantCount }: { property: Property; tenantCount: number }) {
  return (
    <div className="kk-card kk-card-hover p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
        >
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)", letterSpacing: "-0.011em" }}>
            {p.name}
          </p>
          {p.unit && (
            <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Unit {p.unit}</p>
          )}
          <p className="text-[13px] mt-3 truncate" style={{ color: "var(--kk-ink-mute)" }}>{p.address}</p>
          <div className="flex items-center gap-4 mt-4 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {p.owner_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {tenantCount} tenant{tenantCount !== 1 ? "s" : ""}
            </span>
            {(p.photo_urls?.length ?? 0) > 0 && (
              <span style={{ color: "var(--kk-blue)" }}>
                {p.photo_urls!.length} photo{p.photo_urls!.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
