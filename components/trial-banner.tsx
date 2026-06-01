"use client";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const label = daysLeft === 1 ? "1 day" : `${daysLeft} days`;

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2.5 text-center"
      style={{
        background: "#DC2626",
        color: "#fff",
        fontSize: "var(--kk-sm)",
        lineHeight: 1.4,
      }}
    >
      <span>
        <strong>{label} left</strong> on your free trial.{" "}
        <a
          href="/subscription"
          className="underline font-semibold opacity-90 hover:opacity-100 transition-opacity"
        >
          Subscribe here
        </a>{" "}
        to keep your data and full access.
      </span>
    </div>
  );
}
