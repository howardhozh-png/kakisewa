import { getOwnerLeadByIntakeToken } from "@/lib/db";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const TENANTS = [
  {
    id: "1",
    name: "A. Rahman",
    age: 32,
    occupation: "Software Engineer",
    nationality: "Malaysian",
    occupants: 2,
    pets: false,
    smoking: false,
    note: "Clean, quiet couple. No pets. Looking for long-term.",
  },
  {
    id: "2",
    name: "C. Lim",
    age: 28,
    occupation: "Accountant",
    nationality: "Malaysian",
    occupants: 1,
    pets: false,
    smoking: false,
    note: "Single professional. Very tidy. Looking for a quiet home.",
  },
  {
    id: "3",
    name: "W. Tan",
    age: 35,
    occupation: "Marketing Manager",
    nationality: "Malaysian",
    occupants: 3,
    pets: false,
    smoking: false,
    note: "Family of 3. Very stable income, 2 years rental history.",
  },
];

function TenantCard({ tenant, rank }: { tenant: typeof TENANTS[0]; rank: number }) {
  const lifestyle = [
    !tenant.pets ? "No pets" : "Has pets",
    !tenant.smoking ? "Non-smoker" : "Smoker",
  ].join(" · ");

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
          style={{ background: "#1C1C1E", color: "#fff" }}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight" style={{ color: "#1C1C1E" }}>{tenant.name}</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#6C6C70" }}>
            {tenant.age} yrs · {tenant.nationality}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoCell label="Occupation" value={tenant.occupation} />
        <InfoCell label="Occupants" value={`${tenant.occupants} pax`} />
        <InfoCell label="Lifestyle" value={lifestyle} />
        {tenant.note && (
          <div className="col-span-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#AEAEB2" }}>
              Agent note
            </p>
            <p className="text-[13px] leading-snug" style={{ color: "#6C6C70" }}>{tenant.note}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div
          className="w-full px-3 py-2 rounded-xl text-[13px]"
          style={{ background: "#F2F2F7", color: "#AEAEB2", minHeight: 38 }}
        >
          Add a private note for your agent…
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#AEAEB2" }}>
        {label}
      </p>
      <p className="text-[13px]" style={{ color: "#1C1C1E" }}>{value}</p>
    </div>
  );
}

export default async function SamplePackShortPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const owner = await getOwnerLeadByIntakeToken(token);
  if (!owner) notFound();

  let agentName: string | null = null;
  let agentPhone: string | null = null;
  if (owner.user_id) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("agent_profiles")
      .select("name, phone")
      .eq("id", owner.user_id)
      .maybeSingle();
    const row = data as { name?: string; phone?: string } | null;
    agentName = row?.name ?? null;
    agentPhone = row?.phone ?? null;
  }

  const agentFirstName = agentName?.trim().split(/\s+/)[0] ?? null;
  const propertyName = owner.property_name ?? "your property";
  const intakeUrl = `/o/${token}`;

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        <div className="mx-auto max-w-[600px] px-5 py-4 flex items-center gap-2.5">
          <Logo size={24} />
          <span className="font-semibold text-[16px]" style={{ color: "#1C1C1E", letterSpacing: "-0.01em" }}>kakisewa</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#AEAEB2" }}>
            Tenant Pack
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-6">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#AEAEB2" }}>
            Tenants for
          </p>
          <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            {propertyName}
          </h1>
          {(owner.owner_name || agentFirstName) && (
            <p className="text-[18px] mt-0.5 font-bold italic leading-snug" style={{ color: "#1C1C1E" }}>
              {owner.owner_name && <>For {owner.owner_name}</>}
              {owner.owner_name && agentFirstName && <> · </>}
              {agentFirstName && <>by {agentFirstName}</>}
            </p>
          )}
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#6C6C70" }}>
            Drag to rank tenants. Leave notes if any. I get notified instantly to schedule house viewing.
          </p>
        </div>

        <div className="space-y-3">
          {TENANTS.map((t, i) => (
            <TenantCard key={t.id} tenant={t} rank={i + 1} />
          ))}
        </div>

        <div
          className="mt-6 rounded-2xl px-5 py-6"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
        >
          <p className="text-[22px] font-bold leading-snug mb-2" style={{ color: "#1C1C1E" }}>
            Tenants are waiting!
          </p>
          <p className="text-[14px] leading-relaxed mb-5" style={{ color: "#6C6C70" }}>
            To unlock above, 30 seconds from you and I&apos;ll take care of the rest!
          </p>
          <a
            href={intakeUrl}
            className="block w-full text-center px-4 py-4 rounded-2xl text-[16px] font-bold"
            style={{ background: "#007AFF", color: "#fff" }}
          >
            Fill in my details →
          </a>
        </div>

        <p className="text-center text-[11px] mt-6 mb-2" style={{ color: "#C7C7CC" }}>
          Powered by kakisewa
        </p>
      </main>
    </div>
  );
}
