import { getProperties, getTenancies } from "@/lib/db";
import { removeProperty } from "@/lib/actions";
import { Building2, Phone, X } from "lucide-react";
import { AddPropertyDialog } from "@/components/add-property-dialog";
import { PropertyDrawer } from "@/components/property-drawer";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const [properties, tenancies] = await Promise.all([getProperties(), getTenancies()]);

  const countMap = tenancies.reduce<Record<string, number>>((acc, t) => {
    acc[t.property_id] = (acc[t.property_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex items-end justify-between gap-6 mb-12 lg:mb-16">
        <div>
          <p className="kk-overline mb-3">Portfolio</p>
          <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>
            Properties
          </h1>
          <p className="mt-3 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} · tap any to open details.
          </p>
        </div>
        <AddPropertyDialog />
      </header>

      {properties.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div style={{ opacity: 0.55, pointerEvents: "none" }}>
            <div className="kk-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.011em" }}>Agile Mont Kiara</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)", border: "1px solid var(--kk-line)" }}>Sample</span>
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Unit A-12-05</p>
                  <p className="text-[13px] mt-3 truncate" style={{ color: "var(--kk-ink-mute)" }}>Jalan Duta, Kuala Lumpur</p>
                  <div className="flex items-center gap-4 mt-4 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Ahmad Hassan</span>
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />1 tenant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <div key={p.id} className="relative group">
              <PropertyDrawer property={p} tenantCount={countMap[p.id] ?? 0} />
              <form
                className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                action={async () => {
                  "use server";
                  await removeProperty(p.id);
                }}
              >
                <button
                  type="submit"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                  title="Delete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
