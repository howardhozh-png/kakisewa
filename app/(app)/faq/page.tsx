import { ChevronDown, MessageCircle } from "lucide-react";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import Link from "next/link";

export const metadata = { title: "FAQ — kakisewa" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 py-10">
      <div className="mb-8">
        <p className="kk-overline mb-1">Help</p>
        <h1 className="kk-h1" style={{ letterSpacing: "-0.02em" }}>Frequently asked questions</h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--kk-ink-mute)" }}>
          Everything you need to know about using KakiSewa.
        </p>
      </div>

      {/* Jump nav */}
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

      <div className="max-w-3xl space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <p className="kk-overline mb-3">{section.title}</p>
            <div className="kk-section overflow-hidden">
              <div className="divide-y" style={{ borderColor: "var(--kk-line)" }}>
                {section.questions.map((faq, i) => (
                  <details key={i} className="group px-6 py-4">
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
    </div>
  );
}
