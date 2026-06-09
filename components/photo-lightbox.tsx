"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";

interface Props {
  url: string;
  onClose: () => void;
}

export function PhotoLightbox({ url, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true); // capture phase — fires before dialog handlers
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function handleDownload() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `photo.${ext}`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: "rgba(0,0,0,0.88)" }}
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
          aria-label="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <img
        src={url}
        alt=""
        className="rounded-2xl shadow-2xl"
        style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
