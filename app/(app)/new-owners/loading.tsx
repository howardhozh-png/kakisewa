export default function NewOwnersLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-10 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-48 rounded-lg mb-2" style={{ background: "var(--kk-line)" }} />
          <div className="h-4 w-72 rounded-lg" style={{ background: "var(--kk-line)" }} />
        </div>
        <div className="h-9 w-32 rounded-full" style={{ background: "var(--kk-line)" }} />
      </div>

      {/* Sub-nav tabs */}
      <div className="flex gap-2 mb-6">
        {[80, 64].map((w, i) => (
          <div key={i} className="h-8 rounded-full" style={{ width: w, background: "var(--kk-line)" }} />
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="h-4 w-40 rounded mb-2" style={{ background: "var(--kk-line)" }} />
                <div className="h-3 w-56 rounded" style={{ background: "var(--kk-line)" }} />
              </div>
              <div className="h-6 w-16 rounded-full" style={{ background: "var(--kk-line)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
