import { getTenancy } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { UploadPortal } from "@/components/upload-portal";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ tenancy_id: string }>;
}) {
  const { tenancy_id } = await params;
  const tenancy = await getTenancy(tenancy_id);
  if (!tenancy) notFound();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--kk-bg)" }}
    >
      {/* Brand header */}
      <div className="flex flex-col items-center gap-3 mb-12">
        <Logo size={32} className="text-[var(--kk-ink)]" />
        <p
          className="text-[11px] uppercase tracking-[0.16em] font-semibold"
          style={{ color: "var(--kk-ink-faint)" }}
        >
          Receipt upload portal
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-3xl p-8 space-y-7"
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
      >
        <div className="space-y-2">
          <h1
            className="serif text-[26px] tracking-tight leading-tight"
            style={{ color: "var(--kk-ink)" }}
          >
            Hi, {tenancy.tenant_name}.
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            Please upload your payment receipt for{" "}
            <span className="font-medium" style={{ color: "var(--kk-ink)" }}>
              {tenancy.property_name}
            </span>
            .
          </p>
        </div>

        {/* Rent details */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "var(--kk-surface-2)" }}
        >
          <DetailRow label="Property" value={tenancy.property_name ?? "—"} />
          <DetailRow label="Monthly rent" value={`RM ${tenancy.amount.toLocaleString()}`} />
          <DetailRow label="Due day" value={`${tenancy.due_day}${getDaySuffix(tenancy.due_day)} of each month`} />
          <DetailRow
            label="Status"
            value={tenancy.status}
            valueColor={
              tenancy.status === "Verified" ? "var(--kk-green)"
              : tenancy.status === "Paid - Pending Verification" ? "var(--kk-blue)"
              : "var(--kk-amber)"
            }
          />
        </div>

        {/* Upload form / Verified state */}
        {tenancy.status === "Verified" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--kk-green-soft)" }}
            >
              <ShieldCheck className="w-6 h-6" style={{ color: "var(--kk-green)" }} />
            </div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              Receipt already verified
            </p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
              Your payment for this month has been confirmed. Thank you!
            </p>
          </div>
        ) : (
          <UploadPortal tenancyId={tenancy.id} />
        )}
      </div>

      <p className="text-[11px] mt-8" style={{ color: "var(--kk-ink-faint)" }}>
        Powered by kakisewa · AI-powered tenancy CRM
      </p>
    </div>
  );
}

function DetailRow({
  label, value, valueColor,
}: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex justify-between text-[13px]">
      <span style={{ color: "var(--kk-ink-mute)" }}>{label}</span>
      <span className="font-medium" style={{ color: valueColor ?? "var(--kk-ink)" }}>{value}</span>
    </div>
  );
}

function getDaySuffix(day: number) {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}
