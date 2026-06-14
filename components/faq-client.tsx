"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { FAQ_SECTIONS } from "@/lib/faq-content";

export function FaqClient() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      questions: section.questions.filter(
        (faq) =>
          faq.q.toLowerCase().includes(q) ||
          faq.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.questions.length > 0);
  }, [search]);

  const totalMatches = filtered.reduce((n, s) => n + s.questions.length, 0);
  const isSearching = search.trim().length > 0;

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6 max-w-lg">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--kk-ink-faint)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the FAQ..."
          style={{
            width: "100%",
            paddingLeft: 36,
            paddingRight: search ? 36 : 14,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 14,
            borderRadius: 12,
            border: "1px solid var(--kk-line)",
            background: "var(--kk-surface)",
            color: "var(--kk-ink)",
            outline: "none",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--kk-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Jump nav — hide when searching */}
      {!isSearching && (
        <div className="flex flex-wrap gap-2 mb-8">
          {FAQ_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: "var(--kk-surface-2)",
                color: "var(--kk-ink-mute)",
                border: "1px solid var(--kk-line)",
              }}
            >
              {s.title}
            </a>
          ))}
        </div>
      )}

      {/* Search result count */}
      {isSearching && (
        <p className="text-[13px] mb-6" style={{ color: "var(--kk-ink-faint)" }}>
          {totalMatches === 0
            ? "No results found"
            : `${totalMatches} result${totalMatches !== 1 ? "s" : ""} for "${search}"`}
        </p>
      )}

      <div className="max-w-3xl space-y-10">
        {filtered.map((section) => (
          <section key={section.id} id={section.id}>
            <p className="kk-overline mb-3">{section.title}</p>
            <div className="kk-section overflow-hidden">
              <div className="divide-y" style={{ borderColor: "var(--kk-line)" }}>
                {section.questions.map((faq, i) => (
                  <details key={i} className="group px-6 py-4" open={isSearching}>
                    <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                      <span className="text-[14px] font-medium" style={{ color: "var(--kk-ink)" }}>
                        {faq.q}
                      </span>
                      <ChevronDown
                        className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180"
                        style={{ color: "var(--kk-ink-faint)" }}
                      />
                    </summary>
                    <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ))}

        {isSearching && totalMatches === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
          >
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--kk-ink)" }}>
              Nothing found for &ldquo;{search}&rdquo;
            </p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
              Try a different word, or use the chat button below for a direct answer.
            </p>
          </div>
        )}

        {/* Footer CTA */}
        <div
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
        >
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              Still have questions?
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              Use the chat button at the bottom of the screen, or email us directly.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:support@kakisewa.com"
              className="text-[13px] font-semibold px-4 py-2 rounded-full"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              Email support
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
