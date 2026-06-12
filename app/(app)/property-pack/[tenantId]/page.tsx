import { redirect } from "next/navigation";
import { getListedLeadsForPropertyPack, getTenantProfileById } from "@/lib/db";
import { PropertyPackBuilder } from "./property-pack-builder";

export const dynamic = "force-dynamic";

export default async function PropertyPackPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const [tenant, leads] = await Promise.all([
    getTenantProfileById(tenantId),
    getListedLeadsForPropertyPack(),
  ]);
  if (!tenant) redirect("/directory?view=tenants");
  return <PropertyPackBuilder tenant={tenant} leads={leads} />;
}
