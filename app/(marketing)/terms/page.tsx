import React from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

function Nav() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-3.5"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--kk-line)",
      }}
    >
      <Link href="/" className="inline-flex items-center gap-2.5" style={{ color: "var(--kk-ink)" }}>
        <Logo size={28} />
        <span className="serif tracking-tight leading-none" style={{ fontSize: 17.5 }}>kakisewa</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/sign-in" className="font-medium transition-opacity hover:opacity-60" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink-mute)" }}>
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="px-5 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
        >
          Start free trial
        </Link>
      </div>
    </header>
  );
}

export default function TermsPage() {
  return (
    <main style={{ background: "var(--kk-bg)", color: "var(--kk-ink)" }}>
      <Nav />

      <article className="px-6 lg:px-12 py-20 mx-auto" style={{ maxWidth: 760 }}>
        <p className="font-semibold tracking-widest uppercase mb-4"
          style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
          Legal
        </p>
        <h1 className="serif mb-3" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)", marginBottom: 48 }}>
          Effective date: 30 May 2026 · Last updated: 2 June 2026
        </p>

        <Prose>
          <Section title="1. Agreement to Terms">
            <p>
              By accessing or using kakisewa (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, you may not use the Service. These Terms apply to all users, including property agents, negotiators, and any other individuals who register for an account.
            </p>
            <p>
              The Service is operated by the owner of kakisewa, currently registered in Malaysia. References to &ldquo;you&rdquo; or &ldquo;your&rdquo; refer to any individual or entity using the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              kakisewa is a software-as-a-service (SaaS) customer relationship management (CRM) platform designed for Malaysian property agents and negotiators. The Service enables you to manage tenancy contracts, track owner leads, send WhatsApp communication templates, monitor rental collections, and view performance analytics.
            </p>
            <p>
              The Service is currently in <strong>beta</strong>. Features, pricing, and availability may change. We will notify registered users of material changes by email or in-app notice.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p>
              You must create an account to use the Service. You agree to provide accurate, current, and complete information during registration and to keep your account credentials confidential. You are responsible for all activity that occurs under your account.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that we reasonably believe have provided false information, violated these Terms, or engaged in fraudulent activity.
            </p>
          </Section>

          <Section title="4. Trial Period and Subscription">
            <p>
              New users may access the Service under a <strong>2-month free trial</strong>. No payment is required to start your trial. After the trial period, continued access requires an active paid subscription. If you do not subscribe before your trial expires, your account will be placed in read-only mode — your data will be preserved, but you will not be able to add or edit records until you activate a plan.
            </p>
            <p>
              Available plans:
            </p>
            <ul>
              <li>
                <strong>Silver</strong> — RM 69/month (or RM 57/month billed annually at RM 570/year).
                Includes active lead pipeline, owner outreach, bulk upload, owner reply tracking, and branded tenant packs. Up to 20 active contracts tracked.
              </li>
              <li>
                <strong>Gold</strong> — RM 119/month (or RM 99/month billed annually at RM 990/year).
                Everything in Silver, plus commission history and up to 80 active contracts tracked.
              </li>
              <li>
                <strong>Platinum</strong> — RM 179/month (or RM 149/month billed annually at RM 1,490/year).
                Everything in Gold, plus property services contact directory, renewal commission tracking, agent profile page. Up to 200 active contracts tracked.
              </li>
              <li>
                <strong>Elite</strong> — RM 299/month (or RM 249/month billed annually at RM 2,490/year).
                Everything in Platinum, plus public agent profile with search, performance dashboard, and advanced analytics. Unlimited contracts.
              </li>
            </ul>
            <p>
              All fees are stated in Malaysian Ringgit (MYR). Subscriptions are billed monthly or annually in advance depending on the interval you select. You may cancel at any time from your subscription settings; cancellation takes effect at the end of the current billing cycle.
            </p>
          </Section>

          <Section title="5. Payments and Refunds">
            <p>
              Payments are processed securely by Stripe. We accept credit cards and debit cards (Visa, Mastercard). We do not store your full card details on our servers. All fees are exclusive of any applicable taxes; you are responsible for any taxes or duties imposed by your local jurisdiction.
            </p>
            <p>
              We do not offer refunds for partial months of service. If you believe a charge is in error, contact us within 14 days of the charge at <a href="mailto:support@kakisewa.com">support@kakisewa.com</a>.
            </p>
          </Section>

          <Section title="6. Your Data">
            <p>
              You retain full ownership of all data you enter into the Service, including tenant names, phone numbers, property addresses, contract details, and uploaded files. We do not sell, share, or exploit your data for advertising purposes.
            </p>
            <p>
              We may process your data as necessary to deliver the Service, including storing it on cloud infrastructure in Singapore or the United States. See our <Link href="/privacy">Privacy Policy</Link> for full details.
            </p>
            <p>
              Upon account termination or cancellation, we will retain your data for 90 days and then permanently delete it, unless you request earlier deletion by contacting us.
            </p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Violate any applicable law or regulation in Malaysia or elsewhere.</li>
              <li>Send unsolicited bulk communications or spam via WhatsApp or any other channel.</li>
              <li>Impersonate any person or entity.</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
              <li>Use the Service for any purpose other than legitimate property management activities.</li>
            </ul>
          </Section>

          <Section title="8. WhatsApp Integration">
            <p>
              The Service provides tools to generate WhatsApp message links (&ldquo;wa.me&rdquo; links) and, where configured, to send messages via WhatsApp Business API. By using these features, you agree to comply with <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer">WhatsApp&rsquo;s Business Policy</a> and to only message individuals who have consented to receive communications from you.
            </p>
            <p>
              You are solely responsible for the content of any messages sent through the Service. We are not liable for any penalties, account bans, or disputes arising from your WhatsApp communications.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              The Service, including its design, code, logos, and content, is owned by us or our licensors and is protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable licence to use the Service solely for your internal business purposes during your active subscription.
            </p>
            <p>
              You may not copy, reproduce, modify, sell, or distribute any part of the Service without our express written permission.
            </p>
          </Section>

          <Section title="10. Disclaimers">
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We make no warranty as to the accuracy or completeness of any information provided through the Service.
            </p>
            <p>
              Nothing in the Service constitutes legal, financial, or regulatory advice. Commission estimates and renewal alerts are indicative only. You should verify all material information independently.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service, including but not limited to loss of profits, data, or goodwill, even if advised of the possibility of such damages.
            </p>
            <p>
              Our total cumulative liability to you for any cause of action arising under these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </Section>

          <Section title="12. Termination">
            <p>
              We may suspend or terminate your access to the Service at any time, with or without notice, if we believe you have violated these Terms or if we discontinue the Service. You may terminate your account at any time by contacting us.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. Provisions of these Terms that by their nature should survive termination (including Sections 6, 9, 10, 11, and 13) shall survive.
            </p>
          </Section>

          <Section title="13. Governing Law and Disputes">
            <p>
              These Terms are governed by the laws of Malaysia. Any dispute arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Malaysia.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We may update these Terms from time to time. We will notify you of material changes by posting a notice in the Service or by email at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              If you have any questions about these Terms, please contact us at <a href="mailto:support@kakisewa.com">support@kakisewa.com</a>.
            </p>
          </Section>
        </Prose>
      </article>

      <footer
        className="px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: "var(--kk-surface)", borderTop: "1px solid var(--kk-line)" }}
      >
        <Link href="/" className="inline-flex items-center gap-2.5" style={{ color: "var(--kk-ink)" }}>
          <Logo size={24} />
          <span className="serif tracking-tight leading-none" style={{ fontSize: 15 }}>kakisewa</span>
        </Link>
        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>© {new Date().getFullYear()} kakisewa</p>
        <div className="flex items-center gap-5">
          <Link href="/terms" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Terms</Link>
          <Link href="/privacy" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Privacy</Link>
          <Link href="/sign-up" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Start free trial</Link>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="serif mb-3" style={{ fontSize: "1.2rem", letterSpacing: "-0.015em", color: "var(--kk-ink)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "var(--kk-body)",
      lineHeight: 1.7,
      color: "var(--kk-ink-soft)",
    }}
      className="[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6 [&_li]:mb-1.5 [&_a]:underline [&_a:hover]:opacity-70 [&_strong]:font-semibold [&_strong]:text-[color:var(--kk-ink)]"
    >
      {children}
    </div>
  );
}
