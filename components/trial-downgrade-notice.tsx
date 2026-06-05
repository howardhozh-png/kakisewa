"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clearTrialDowngradeNotice } from "@/lib/actions";

interface Props {
  archivedCount: number | null;
}

export function TrialDowngradeNotice({ archivedCount }: Props) {
  const [open, setOpen] = useState(archivedCount !== null);

  async function handleClose() {
    setOpen(false);
    await clearTrialDowngradeNotice();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-4">

          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)" }}
          >
            <span style={{ fontSize: 22 }}>⏰</span>
          </div>

          <h2
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: "var(--kk-ink)" }}
          >
            Your Elite trial has ended.
          </h2>

          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--kk-ink-mute)", maxWidth: "30ch" }}
          >
            {"You're now on Silver. All your data is safe"}
            {archivedCount && archivedCount > 0 ? (
              <> — <span style={{ color: "var(--kk-ink)", fontWeight: 600 }}>{archivedCount} renewal card{archivedCount === 1 ? "" : "s"}</span> {archivedCount === 1 ? "is" : "are"} archived until you upgrade.</>
            ) : "."}
          </p>

          <div className="w-full flex flex-col gap-2 mt-1">
            <Link
              href="/subscription"
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              View plans <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--kk-ink-mute)" }}
            >
              Got it
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
