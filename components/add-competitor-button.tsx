"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddCompetitorDialog } from "@/components/add-competitor-dialog";
import type { OwnerLead } from "@/lib/types";

export function AddCompetitorButton({ ownerLeads = [] }: { ownerLeads?: OwnerLead[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="kk-pill kk-pill-white flex items-center gap-1.5 text-[13px] font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Add target
      </button>
      <AddCompetitorDialog open={open} onOpenChange={setOpen} ownerLeads={ownerLeads} />
    </>
  );
}
