import { FaqClient } from "@/components/faq-client";

export const metadata = { title: "FAQ — kakisewa" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 py-10">
      <div className="mb-6">
        <p className="kk-overline mb-1">Help</p>
        <h1 className="kk-h1" style={{ letterSpacing: "-0.02em" }}>Frequently asked questions</h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--kk-ink-mute)" }}>
          Everything you need to know about using kakisewa.
        </p>
      </div>

      <FaqClient />
    </div>
  );
}
