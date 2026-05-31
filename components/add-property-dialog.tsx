"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addProperty } from "@/lib/actions";
import { toast } from "sonner";

export function AddPropertyDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addProperty(fd);
      setOpen(false);
      toast.success("Property added.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="kk-pill kk-pill-primary">
            <Plus className="w-3.5 h-3.5" /> Add property
          </button>
        }
      />
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">Add new property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <Field label="Property name" name="name" placeholder="e.g. Residensi Mutiara, Unit A-12" required />
          <Field label="Address" name="address" placeholder="Full street address" required />
          <Field label="Unit / block (optional)" name="unit" placeholder="e.g. A-12" />
          <Field label="Owner name" name="owner_name" placeholder="Full name" required />
          <Field label="Owner phone (WhatsApp)" name="owner_phone" placeholder="601XXXXXXXX" required />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="kk-pill kk-pill-ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="kk-pill kk-pill-primary"
            >
              {pending ? "Saving…" : "Save property"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, name, placeholder, required,
}: {
  label: string; name: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>
        {label}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}
