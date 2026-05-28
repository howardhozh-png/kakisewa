import { Logo } from "@/components/logo";

export const dynamic = "force-static";

const SAMPLE_TENANTS = [
  {
    id: "1",
    name: "A. Rahman",
    age: 32,
    occupation: "Software Engineer",
    employer: "Top Tech Co.",
    nationality: "Malaysian",
    income: 9500,
    movein: "Jul 2025",
    occupants: "2 pax",
    pets: false,
    smoking: false,
    budget: "RM 3,000 – 4,500",
    note: "Clean, quiet couple. No pets. Looking for long-term.",
    liked: true,
  },
  {
    id: "2",
    name: "C. Lim",
    age: 28,
    occupation: "Accountant",
    employer: "Big 4 Firm",
    nationality: "Malaysian",
    income: 7800,
    movein: "Aug 2025",
    occupants: "1 pax",
    pets: false,
    smoking: false,
    budget: "RM 2,500 – 3,800",
    note: "Single professional. Works from home 3 days a week.",
    liked: false,
  },
  {
    id: "3",
    name: "P. Singh",
    age: 35,
    occupation: "Doctor",
    employer: "Private Hospital",
    nationality: "Malaysian PR",
    income: 14000,
    movein: "Flexible",
    occupants: "3 pax (family)",
    pets: false,
    smoking: false,
    budget: "RM 4,000 – 6,000",
    note: "Family of 3. Kids aged 4 and 7. Prefer higher floor.",
    liked: false,
  },
];

function TenantCard({ tenant, rank }: { tenant: typeof SAMPLE_TENANTS[0]; rank: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
            style={{ background: "var(--kk-ink)", color: "#fff" }}
          >
            {rank}
          </div>
          <div>
            <p className="text-[16px] font-semibold" style={{ color: "var(--kk-ink)" }}>{tenant.name}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              {tenant.age} yrs · {tenant.nationality}
            </p>
          </div>
        </div>
        {tenant.liked && (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626" }}
          >
            ❤ Shortlisted
          </span>
        )}
      </div>

      <div className="px-5 pb-5 grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Occupation</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{tenant.occupation}</p>
          <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>{tenant.employer}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Monthly income</p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>RM {tenant.income.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Move-in</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{tenant.movein}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Occupants</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{tenant.occupants}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Budget</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>{tenant.budget}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Lifestyle</p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>
            {[!tenant.pets && "No pets", !tenant.smoking && "Non-smoker"].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {tenant.note && (
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Agent note</p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{tenant.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SamplePackPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <header className="border-b" style={{ borderColor: "var(--kk-line)" }}>
        <div className="mx-auto max-w-[900px] px-6 py-5 flex items-center gap-2.5">
          <Logo size={26} />
          <span className="serif text-[18px] tracking-tight" style={{ color: "var(--kk-ink)" }}>kakisewa</span>
          <span className="ml-3 text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--kk-ink-faint)" }}>
            Tenant pack · Sample
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-12 lg:py-16">
        {/* Sample banner */}
        <div
          className="mb-8 px-4 py-3 rounded-xl text-[13px] font-medium"
          style={{ background: "rgba(0,113,227,0.08)", color: "var(--kk-blue)", border: "1px solid rgba(0,113,227,0.18)" }}
        >
          This is a sample pack to show you how we present tenant profiles. Names and contact details are masked.
        </div>

        <div className="mb-10">
          <p className="kk-overline mb-3">Sample tenants for</p>
          <h1 className="serif text-[34px] tracking-tight leading-tight" style={{ color: "var(--kk-ink)" }}>
            Your Listing
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: "var(--kk-ink-mute)" }}>
            Your agent curates a shortlist of vetted tenants and sends you this link. You rank them in order of preference — your agent schedules viewings accordingly.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-4 text-[12px]">
            <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>RM 3,500/mo</span>
            <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>3 bed</span>
            <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>2 bath</span>
          </div>
        </div>

        <div className="space-y-4">
          {SAMPLE_TENANTS.map((t, i) => (
            <TenantCard key={t.id} tenant={t} rank={i + 1} />
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-[900px] px-6 py-8 text-center text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
        Powered by kakisewa · AI-powered tenancy CRM
      </footer>
    </div>
  );
}
