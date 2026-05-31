import { redirect } from "next/navigation";

export default function SupportsPage() {
  redirect("/directory?view=contacts");
}
