"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { LhdnStatus } from "@/lib/types";
import { generateLhdn } from "@/lib/actions";

interface Props {
  tenancyId: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  month: string;
  lhdnStatus: LhdnStatus;
}

export function LhdnButton({ tenancyId, month, lhdnStatus }: Props) {
  const [status, setStatus] = useState<LhdnStatus>(lhdnStatus);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  if (status === "submitted") {
    return (
      <span className="kk-pill kk-pill-soft-green">
        <CheckCircle2 className="w-3.5 h-3.5" />
        e-Invois submitted
      </span>
    );
  }

  function handleClick() {
    setPending(true);
    startTransition(async () => {
      const result = await generateLhdn(tenancyId);
      if (result.ok) {
        setStatus("generated");
        const blob = new Blob([result.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lhdn_${tenancyId}_${month.replace(" ", "_")}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setPending(false);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="kk-pill kk-pill-soft-purple"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      {status === "generated" ? "Re-gen e-Invois" : "e-Invois"}
    </button>
  );
}
