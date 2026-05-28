"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, ImageIcon, CheckCircle2, X, Loader2 } from "lucide-react";
import { submitReceiptUpload } from "@/lib/actions";
import { toast } from "sonner";

export function UploadPortal({ tenancyId }: { tenancyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10 MB.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tenancy_id", tenancyId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });

        if (!uploadRes.ok) {
          const { error } = await uploadRes.json();
          toast.error(error ?? "Upload failed.");
          return;
        }

        const { url } = (await uploadRes.json()) as { url: string };

        const res = await submitReceiptUpload(tenancyId, url);
        if (res.ok) {
          setDone(true);
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      } catch {
        toast.error("Upload failed. Please try again.");
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--kk-green-soft)" }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: "var(--kk-green)" }} />
        </div>
        <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
          Receipt submitted
        </p>
        <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
          Your agent will verify it shortly. Thank you!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="kk-overline">Upload payment receipt</p>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors select-none"
          style={{
            border: `1.5px dashed ${dragging ? "var(--kk-blue)" : "var(--kk-line-strong)"}`,
            background: dragging ? "var(--kk-blue-soft)" : "var(--kk-surface-2)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
          >
            <Upload className="w-5 h-5" style={{ color: "var(--kk-ink-mute)" }} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium" style={{ color: "var(--kk-ink)" }}>
              Tap to upload or drag &amp; drop
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
              JPG, PNG, HEIC up to 10 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Receipt preview" className="w-full max-h-60 object-cover" />
          <button
            onClick={() => { setFile(null); setPreview(null); }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.92)", color: "var(--kk-ink)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <X className="w-4 h-4" />
          </button>
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center gap-1.5 text-[12px] text-white"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)" }}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {file?.name}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || pending}
        className="kk-pill kk-pill-blue w-full justify-center"
        style={{ padding: "0.75rem 1.25rem", fontSize: "14px" }}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Submit receipt
          </>
        )}
      </button>

      <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
        Your receipt will be reviewed by your property agent.
      </p>
    </div>
  );
}
