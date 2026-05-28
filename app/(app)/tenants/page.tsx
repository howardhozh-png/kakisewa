import { redirect } from "next/navigation";

export default function TenantsPage() {
  redirect("/network?view=tenants");
}
