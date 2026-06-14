export default function LostListingLoading() {
  const cols = [
    { label: 56, cards: 3 },
    { label: 68, cards: 2 },
    { label: 60, cards: 4 },
    { label: 40, cards: 2 },
  ];
  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-44 rounded-lg mb-3" style={{ background: "var(--kk-line)" }} />
          <div className="h-4 w-96 rounded-lg" style={{ background: "var(--kk-line)" }} />
        </div>
        <div className="h-9 w-28 rounded-full" style={{ background: "var(--kk-line)" }} />
      </div>

      {/* Competitor board columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {cols.map(({ label, cards }, col) => (
          <div key={col} className="flex-shrink-0 w-72 rounded-2xl p-3" style={{ background: "var(--kk-surface-2)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 rounded" style={{ background: "var(--kk-line)", width: label }} />
              <div className="h-5 w-5 rounded-full" style={{ background: "var(--kk-line)" }} />
            </div>
            <div className="flex flex-col gap-2">
              {[...Array(cards)].map((_, i) => (
                <div key={i} className="rounded-xl p-3.5" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
                  <div className="h-4 w-28 rounded mb-2" style={{ background: "var(--kk-line)" }} />
                  <div className="h-3 w-16 rounded mb-2.5" style={{ background: "var(--kk-line)" }} />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 rounded-full" style={{ background: "var(--kk-line)" }} />
                    <div className="h-3 w-12 rounded" style={{ background: "var(--kk-line)" }} />
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
