import { redirect } from "next/navigation";

export default function SupportsPage() {
  redirect("/network?view=contacts");
}
