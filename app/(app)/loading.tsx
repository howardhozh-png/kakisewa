export default function Loading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="max-w-[1440px] mx-auto space-y-4">
        <div className="h-8 rounded-xl w-48" style={{ background: "var(--kk-line)" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--kk-line)" }} />
          ))}
        </div>
        <div className="h-64 rounded-2xl mt-4" style={{ background: "var(--kk-line)" }} />
      </div>
    </div>
  );
}
