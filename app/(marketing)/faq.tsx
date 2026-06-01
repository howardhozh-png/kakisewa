"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No — sign up and get full access immediately. We'll only ask for payment details when your trial ends and you choose to continue.",
  },
  {
    q: "What happens when my trial ends?",
    a: "You'll get a reminder before it expires. To keep your listings, leads, and history, simply pick a plan. Nothing is deleted.",
  },
  {
    q: "How does KakiSewa remind me about expiring contracts?",
    a: "You get WhatsApp and in-app alerts 60 days before a contract expires — then again at 30 and 7 days. You always follow up first, before another agent does.",
  },
  {
    q: "How does the tenant pack work?",
    a: "You select approved tenant profiles and share one branded link with the owner. They browse, compare, and pick — without chasing you on WhatsApp.",
  },
  {
    q: "Can I import my existing listings from Excel?",
    a: "Yes. Add listings manually or in bulk. If you need help migrating your current data, reach out and we'll handle it.",
  },
  {
    q: "Is KakiSewa only for Malaysian rental agents?",
    a: "For now, yes. It's purpose-built for residential rental agents in Malaysia — pricing in RM, workflows tuned for how the local market runs.",
  },
  {
    q: "What if I'm not great with technology?",
    a: "Most agents are fully set up in under 10 minutes. If you live on WhatsApp, you'll be fine. Support is one message away if you get stuck.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel before your next billing date and you won't be charged again. No lock-in, no cancellation fee.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {FAQS.map((item, i) => (
        <div key={i} style={{ borderBottom: "1px solid var(--kk-line)" }}>
          <button
            className="w-full flex items-center justify-between py-5 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span
              className="font-semibold pr-8"
              style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)" }}
            >
              {item.q}
            </span>
            <ChevronDown
              className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              style={{
                color: "var(--kk-ink-mute)",
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>
          {open === i && (
            <p
              className="pb-5"
              style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.7 }}
            >
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
