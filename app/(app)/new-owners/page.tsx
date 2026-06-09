import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LegacyNewOwnersPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  redirect(tab === "pipeline" ? "/track-listing" : "/message-owners");
}
