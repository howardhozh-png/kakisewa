import { redirect } from "next/navigation";

export default function MatchingIndexRedirect() {
  redirect("/message-owners");
}
