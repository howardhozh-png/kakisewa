import { getMatchPackByToken, getPackTenants } from "@/lib/db";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { SharePackViewer } from "@/components/share-pack-viewer";

export const dynamic = "force-dynamic";

export default async function SharePackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pack = await getMatchPackByToken(token);
  if (!pack) notFound();
  const tenants = await getPackTenants(pack.id);

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <header className="border-b" style={{ borderColor: "var(--kk-line)" }}>
        <div className="mx-auto max-w-[900px] px-6 py-5 flex items-center gap-2.5">
          <Logo size={26} />
          <span className="serif text-[18px] tracking-tight" style={{ color: "var(--kk-ink)" }}>kakisewa</span>
          <span className="ml-3 text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--kk-ink-faint)" }}>
            Tenant pack
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-12 lg:py-16">
        <div className="mb-10">
          <p className="kk-overline mb-3">Tenants for</p>
          <h1 className="serif text-[34px] tracking-tight leading-tight" style={{ color: "var(--kk-ink)" }}>
            {pack.property_label ?? "Your property"}
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: "var(--kk-ink-mute)" }}>
            Drag the cards to rank tenants in your preferred order. Tap the heart on the ones you&apos;d like to schedule a viewing with. Your agent will receive your ranking instantly.
          </p>
          {(pack.property_rent || pack.property_beds || pack.property_baths) && (
            <div className="flex flex-wrap gap-1.5 mt-4 text-[12px]">
              {pack.property_rent != null && (
                <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
                  RM {pack.property_rent.toLocaleString()}/mo
                </span>
              )}
              {pack.property_beds != null && (
                <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                  {pack.property_beds} bed
                </span>
              )}
              {pack.property_baths != null && (
                <span className="px-2.5 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                  {pack.property_baths} bath
                </span>
              )}
            </div>
          )}
        </div>

        {tenants.length === 0 ? (
          <div className="kk-section flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
            <p className="kk-h3" style={{ color: "var(--kk-ink)" }}>No tenants in this pack yet</p>
            <p className="kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
              Your agent is still putting it together. Please check back shortly.
            </p>
          </div>
        ) : (
          <SharePackViewer packId={pack.id} initialTenants={tenants} />
        )}
      </main>

      <footer className="mx-auto max-w-[900px] px-6 py-8 text-center text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
        Powered by kakisewa · AI-powered tenancy CRM
      </footer>
    </div>
  );
}
