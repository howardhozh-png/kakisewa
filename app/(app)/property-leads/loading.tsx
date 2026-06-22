export default function PotentialListingLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-52 rounded-lg mb-3" style={{ background: "var(--kk-line)" }} />
          <div className="h-4 w-80 rounded-lg" style={{ background: "var(--kk-line)" }} />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-full" style={{ background: "var(--kk-line)" }} />
          <div className="h-9 w-28 rounded-full" style={{ background: "var(--kk-line)" }} />
        </div>
      </div>

      {/* Search + filters bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 h-10 rounded-xl" style={{ background: "var(--kk-line)" }} />
        <div className="h-10 w-24 rounded-full" style={{ background: "var(--kk-line)" }} />
        <div className="h-10 w-28 rounded-full" style={{ background: "var(--kk-line)" }} />
        <div className="h-10 w-24 rounded-full" style={{ background: "var(--kk-line)" }} />
      </div>

      {/* WA counter bar */}
      <div className="h-11 w-full rounded-xl mb-4" style={{ background: "var(--kk-line)" }} />

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3" style={{ background: "var(--kk-surface-2)", borderBottom: "1px solid var(--kk-line)" }}>
          <div className="h-3 w-4 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-24 rounded flex-1" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-24 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-16 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-28 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-20 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-20 rounded" style={{ background: "var(--kk-line)" }} />
          <div className="h-3 w-16 rounded" style={{ background: "var(--kk-line)" }} />
        </div>
        {/* Table rows */}
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: "1px solid var(--kk-line)" }}>
            <div className="h-4 w-4 rounded" style={{ background: "var(--kk-line)" }} />
            <div className="h-4 rounded flex-1" style={{ background: "var(--kk-line)", width: `${60 + (i % 3) * 15}%` }} />
            <div className="h-4 w-28 rounded" style={{ background: "var(--kk-line)" }} />
            <div className="h-4 w-14 rounded" style={{ background: "var(--kk-line)" }} />
            <div className="h-4 w-32 rounded" style={{ background: "var(--kk-line)" }} />
            <div className="h-6 w-20 rounded-full" style={{ background: "var(--kk-line)" }} />
            <div className="h-4 w-16 rounded" style={{ background: "var(--kk-line)" }} />
            <div className="flex gap-1.5">
              <div className="h-7 w-7 rounded-full" style={{ background: "var(--kk-line)" }} />
              <div className="h-7 w-7 rounded-full" style={{ background: "var(--kk-line)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
