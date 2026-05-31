import { redirect } from "next/navigation";

export default function MatchingIndexRedirect() {
  redirect("/new-owners?view=matches");
}
