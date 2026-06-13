import { Mail, BookOpen, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Help & support — kakisewa" };

const FAQS = [
  {
    q: "How do I import my owner leads?",
    a: "Go to Manage new leads → click the import button in the top-right of the board. Upload a CSV with columns: owner_name, owner_phone, property_name, unit, expected_rent, bedrooms, bathrooms. Download the template if you're unsure of the format.",
  },
  {
    q: "Why isn't my WhatsApp message sending?",
    a: "kakisewa opens WhatsApp with a pre-filled message. It uses your phone's WhatsApp app (wa.me links). Make sure WhatsApp is installed and you're logged in. If the link opens but the message isn't pre-filled, try on a different browser.",
  },
  {
    q: "How does the renewal pipeline work?",
    a: "Tenancies within 60 days of contract expiry automatically appear in Follow-up. Send check-ins, track replies with the T/O chips, then move cards through Pinged → Renewing once both sides confirm. Confirming commission resets the card back to Active with the new end date.",
  },
  {
    q: "Can I track multiple properties under one owner?",
    a: "Yes. Each property is a separate record but you can filter the kanban by owner name. When a tenant leaves (Replacing stage), a new listing is auto-created under the same owner in Make new money.",
  },
  {
    q: "How is commission calculated?",
    a: "By default, 1 month's rent = 100% commission. You can override the percentage per deal in the lead card's edit dialog, or change your agency default under Set goals → commission %.",
  },
  {
    q: "Is my data backed up?",
    a: "Yes. All data is stored in Supabase (a managed cloud database with daily backups and point-in-time recovery). You can also export your leads and tenancies to CSV at any time from the board header.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 py-10">
      <div className="mb-8">
        <p className="kk-overline mb-1">Settings</p>
        <h1 className="kk-h1" style={{ letterSpacing: "-0.02em" }}>Help & support</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl">

        {/* Contact options */}
        <div className="lg:col-span-1 space-y-4">
          <section className="kk-section p-6">
            <h2 className="text-[15px] font-semibold mb-4" style={{ color: "var(--kk-ink)" }}>Get in touch</h2>
            <div className="space-y-3">
              <a
                href="mailto:support@kakisewa.com"
                className="kk-scale-hover flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--kk-blue-soft)", color: "var(--kk-blue)" }}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">Email support</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>support@kakisewa.com</p>
                </div>
              </a>
            </div>
          </section>

          <section className="kk-section p-6">
            <h2 className="text-[15px] font-semibold mb-2" style={{ color: "var(--kk-ink)" }}>Full FAQ</h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>
              Step-by-step guides for every feature in the app.
            </p>
            <Link
              href="/faq"
              className="kk-scale-hover inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full"
              style={{ background: "var(--kk-blue)", color: "#fff" }}
            >
              Browse FAQ
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          <section className="kk-section p-6">
            <h2 className="text-[15px] font-semibold mb-2" style={{ color: "var(--kk-ink)" }}>Beta feedback</h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--kk-ink-mute)" }}>
              Found a bug or have a feature idea? We read everything.
            </p>
            <a
              href="mailto:support@kakisewa.com?subject=Beta feedback"
              className="kk-scale-hover inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              <Mail className="w-3.5 h-3.5" />
              Send feedback
            </a>
          </section>
        </div>

        {/* FAQ */}
        <div className="lg:col-span-2">
          <section className="kk-section overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex items-center gap-3">
              <BookOpen className="w-4 h-4" style={{ color: "var(--kk-ink-mute)" }} />
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Frequently asked questions</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--kk-line)" }}>
              {FAQS.map((faq, i) => (
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
          </section>
        </div>

      </div>
    </div>
  );
}
