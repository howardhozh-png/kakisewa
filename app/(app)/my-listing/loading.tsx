export default function MyListingLoading() {
  const cols = [
    { label: 60, cards: 3 },
    { label: 44, cards: 2 },
    { label: 52, cards: 4 },
    { label: 48, cards: 1 },
  ];
  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-40 rounded-lg mb-3" style={{ background: "var(--kk-line)" }} />
          <div className="h-4 w-72 rounded-lg" style={{ background: "var(--kk-line)" }} />
        </div>
        <div className="h-9 w-32 rounded-full" style={{ background: "var(--kk-line)" }} />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {cols.map(({ label, cards }, col) => (
          <div key={col} className="flex-shrink-0 w-72 rounded-2xl p-3" style={{ background: "var(--kk-surface-2)" }}>
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 rounded" style={{ background: "var(--kk-line)", width: label }} />
              <div className="h-5 w-5 rounded-full" style={{ background: "var(--kk-line)" }} />
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-2">
              {[...Array(cards)].map((_, i) => (
                <div key={i} className="rounded-xl p-3.5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  <div className="h-4 w-36 rounded mb-2" style={{ background: "var(--kk-line)" }} />
                  <div className="h-3 w-24 rounded mb-3" style={{ background: "var(--kk-line)" }} />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-14 rounded-full" style={{ background: "var(--kk-line)" }} />
                    <div className="h-5 w-10 rounded-full" style={{ background: "var(--kk-line)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
