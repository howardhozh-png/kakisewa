import { getTenantProfileFull } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getTenantProfileFull(id);
  if (!profile) notFound();

  const submittedAt = profile.intake_completed_at
    ? format(new Date(profile.intake_completed_at), "d MMM yyyy")
    : null;

  const budgetLabel =
    profile.budget_min != null && profile.budget_max != null
      ? `RM ${profile.budget_min.toLocaleString()} – RM ${profile.budget_max.toLocaleString()}`
      : profile.budget_max != null
        ? `Up to RM ${profile.budget_max.toLocaleString()}`
        : profile.budget_min != null
          ? `From RM ${profile.budget_min.toLocaleString()}`
          : null;

  function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
    if (value == null || value === "") return null;
    return (
      <div className="flex flex-col gap-0.5 py-3" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-ink-faint)" }}>{label}</span>
        <span className="text-[15px] font-medium" style={{ color: "var(--kk-ink)" }}>{value}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/directory?view=tenants"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-8 hover:opacity-70 transition-opacity"
        style={{ color: "var(--kk-ink-mute)", textDecoration: "none" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to directory
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-[20px] font-bold"
          style={{ background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: "var(--kk-ink)" }}>
            {profile.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }}
            >
              Submitted
            </span>
            {submittedAt && (
              <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{submittedAt}</span>
            )}
          </div>
        </div>
      </div>

      {/* Property Preferences */}
      <div className="kk-card p-6 mb-4">
        <p className="kk-overline mb-4">Property preferences</p>

        {budgetLabel && <Row label="Budget" value={budgetLabel} />}
        {profile.bedrooms_pref != null && <Row label="Bedrooms" value={`${profile.bedrooms_pref} bedrooms`} />}
        {profile.preferred_move_in && <Row label="Move-in date" value={profile.preferred_move_in} />}
        {profile.area_preference && <Row label="Area preference" value={profile.area_preference} />}
        {profile.furnishing_preference && <Row label="Furnishing" value={profile.furnishing_preference} />}

        {(profile.pets != null || profile.smoking != null) && (
          <div className="flex gap-2 pt-3">
            {profile.pets != null && (
              <span
                className="text-[12px] font-medium px-3 py-1 rounded-full"
                style={{
                  background: profile.pets ? "var(--kk-amber-soft)" : "var(--kk-surface-2)",
                  color: profile.pets ? "#B45309" : "var(--kk-ink-mute)",
                }}
              >
                {profile.pets ? "Has pets" : "No pets"}
              </span>
            )}
            {profile.smoking != null && (
              <span
                className="text-[12px] font-medium px-3 py-1 rounded-full"
                style={{
                  background: profile.smoking ? "var(--kk-red-soft)" : "var(--kk-surface-2)",
                  color: profile.smoking ? "var(--kk-red)" : "var(--kk-ink-mute)",
                }}
              >
                {profile.smoking ? "Smoker" : "Non-smoker"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Personal Info */}
      <div className="kk-card p-6">
        <p className="kk-overline mb-4">Personal info</p>

        {profile.occupation && <Row label="Occupation" value={profile.occupation} />}
        {profile.nationality && <Row label="Nationality" value={profile.nationality} />}
        {profile.age != null && <Row label="Age" value={`${profile.age} years old`} />}
        {profile.monthly_income != null && <Row label="Monthly income" value={`RM ${profile.monthly_income.toLocaleString()}`} />}
        {profile.occupants != null && <Row label="Total occupants" value={`${profile.occupants} person${profile.occupants !== 1 ? "s" : ""}`} />}
        {profile.phone && <Row label="Phone" value={profile.phone} />}
        {profile.notes && <Row label="Notes" value={profile.notes} />}
      </div>
    </div>
  );
}
