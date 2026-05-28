"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";

export function ForwardButton({ whatsappUrl, propertyName }: { whatsappUrl: string; propertyName: string }) {
  return (
    <button
      onClick={() => {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        toast.success(`Forwarded to owner. ${propertyName}.`);
      }}
      className="kk-pill kk-pill-soft-green"
    >
      <Send className="w-3.5 h-3.5" />
      Forward to owner
    </button>
  );
}
