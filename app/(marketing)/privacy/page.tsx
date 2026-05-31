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

export default function PrivacyPage() {
  return (
    <main style={{ background: "var(--kk-bg)", color: "var(--kk-ink)" }}>
      <Nav />

      <article className="px-6 lg:px-12 py-20 mx-auto" style={{ maxWidth: 760 }}>
        <p className="font-semibold tracking-widest uppercase mb-4"
          style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
          Legal
        </p>
        <h1 className="serif mb-3" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-faint)", marginBottom: 48 }}>
          Effective date: 30 May 2026 · Last updated: 30 May 2026
        </p>

        <Prose>
          <Section title="1. Introduction">
            <p>
              kakisewa (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains what personal data we collect when you use kakisewa (the &ldquo;Service&rdquo;), how we use it, and your rights regarding that data.
            </p>
            <p>
              By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <p><strong>Account data:</strong> When you register, we collect your name, email address, phone number, and any profile information you choose to provide, such as your agency name, REN number, and profile photo.</p>
            <p><strong>Professional data:</strong> Information you enter about your business, including property addresses, unit details, owner names and phone numbers, tenant names and phone numbers, tenancy contract dates, rent amounts, and commission records.</p>
            <p><strong>Uploaded files:</strong> Receipts, tenancy agreements, and photos you upload are stored securely in cloud object storage.</p>
            <p><strong>Usage data:</strong> We automatically collect information about how you use the Service, including pages visited, features used, and device information (browser type, operating system, IP address). This helps us improve the Service.</p>
            <p><strong>Payment data:</strong> Billing details are collected and processed directly by Stripe. We store only the last four digits of your card, card type, and billing status — never your full card number or CVV.</p>
            <p><strong>Communications:</strong> If you contact us by email, we keep records of that correspondence to resolve your query.</p>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>We use your data to:</p>
            <ul>
              <li>Provide, operate, and maintain the Service.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Generate WhatsApp message links and, where you have enabled it, send automated messages on your behalf to your contacts.</li>
              <li>Send you service-related notices (account alerts, expiry reminders, billing receipts) by email or in-app notification.</li>
              <li>Detect, investigate, and prevent fraudulent or illegal activity.</li>
              <li>Analyse aggregate usage patterns to improve the Service. We do not use your individual data for advertising.</li>
              <li>Comply with our legal obligations in Malaysia.</li>
            </ul>
          </Section>

          <Section title="4. WhatsApp Messaging">
            <p>
              The Service generates WhatsApp message links (&ldquo;wa.me&rdquo; links) and may, through an integrated WhatsApp Business API provider, send automated messages on your behalf to phone numbers you have entered. These messages include rent reminders, renewal check-ins, and intake form links.
            </p>
            <p>
              <strong>You are responsible</strong> for ensuring that the individuals you message have consented to receive WhatsApp communications from you. We do not message your contacts independently — all sends are triggered by your actions within the Service.
            </p>
            <p>
              Phone numbers you enter are used solely to deliver these messages and to display within your account. We do not share phone numbers with third parties for marketing.
            </p>
          </Section>

          <Section title="5. Data Sharing and Third-Party Services">
            <p>We do not sell your personal data. We share data with third parties only as necessary to operate the Service:</p>
            <ul>
              <li><strong>Supabase</strong> — authentication and database hosting (Singapore region).</li>
              <li><strong>Vercel</strong> — application hosting and edge delivery (global CDN with data processed in the United States).</li>
              <li><strong>Stripe</strong> — payment processing (subject to Stripe&rsquo;s Privacy Policy).</li>
              <li><strong>Twilio / WhatsApp Business API provider</strong> — where automated WhatsApp sends are enabled.</li>
              <li><strong>OpenAI</strong> — receipt image analysis for AI-assisted verification (images are not stored by OpenAI beyond the API call).</li>
            </ul>
            <p>
              Each third-party service is bound by its own privacy policy. We recommend reviewing them if you have specific concerns.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you cancel your subscription or your account is terminated, your data is kept for 90 days in case you wish to reactivate, and then permanently deleted.
            </p>
            <p>
              You may request immediate deletion of your data at any time by contacting us at <a href="mailto:support@kakisewa.com">support@kakisewa.com</a>. Certain data may be retained for longer where required by law (for example, billing records).
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>
              We implement appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure, or destruction. This includes encrypted connections (HTTPS/TLS), access controls, and regular security reviews.
            </p>
            <p>
              No method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="8. Cookies and Local Storage">
            <p>
              The Service uses browser cookies and local storage to maintain your session, remember your preferences (such as your colour theme), and track whether you have completed the onboarding tour. We do not use third-party advertising cookies.
            </p>
            <p>
              You can configure your browser to refuse cookies, but some parts of the Service may not function correctly without them.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>Subject to applicable law, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate or incomplete data.</li>
              <li><strong>Delete</strong> your personal data (subject to legal retention obligations).</li>
              <li><strong>Export</strong> your data in a portable format.</li>
              <li><strong>Withdraw consent</strong> where processing is based on consent.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at <a href="mailto:support@kakisewa.com">support@kakisewa.com</a>. We will respond within 30 days.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              The Service is intended for professional use by adults aged 18 and above. We do not knowingly collect personal data from individuals under 18. If you believe we have inadvertently collected such data, please contact us immediately.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice in the Service or by email at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us at:
            </p>
            <p>
              <strong>kakisewa</strong><br />
              Email: <a href="mailto:support@kakisewa.com">support@kakisewa.com</a>
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
