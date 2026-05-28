import { getProperties, getTenancies } from "@/lib/db";
import { removeProperty } from "@/lib/actions";
import { Building2, X } from "lucide-react";
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
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
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
        <div className="kk-section flex flex-col items-center justify-center gap-5 py-24 px-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)" }}
          >
            <Building2 className="w-6 h-6" style={{ color: "var(--kk-ink-mute)" }} />
          </div>
          <div className="text-center max-w-sm">
            <p className="kk-h3" style={{ color: "var(--kk-ink)" }}>No properties yet</p>
            <p className="mt-2 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
              Add your first property to start collecting rent.
            </p>
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
