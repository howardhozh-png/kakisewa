export default function ExistingContractsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-56 rounded-lg mb-2" style={{ background: "var(--kk-line)" }} />
          <div className="h-4 w-80 rounded-lg" style={{ background: "var(--kk-line)" }} />
        </div>
        <div className="h-9 w-36 rounded-xl" style={{ background: "var(--kk-line)" }} />
      </div>

      {/* Lifecycle board columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="flex-shrink-0 w-72 rounded-2xl p-3" style={{ background: "var(--kk-surface-2)" }}>
            <div className="h-5 w-28 rounded mb-3" style={{ background: "var(--kk-line)" }} />
            <div className="flex flex-col gap-2">
              {Array.from({ length: col === 0 ? 4 : col === 1 ? 3 : 2 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  <div className="h-4 w-36 rounded mb-2" style={{ background: "var(--kk-line)" }} />
                  <div className="h-3 w-24 rounded" style={{ background: "var(--kk-line)" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
