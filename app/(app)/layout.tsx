import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { SpotlightTour } from "@/components/spotlight-tour";
import { Toaster } from "@/components/ui/sonner";
import { getAgentProfile, recordLoginStreak } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  const streak = recordLoginStreak();
  return (
    <div className="flex flex-col min-h-screen">
      <AccentProvider color={agent.accent_color} />
      <TopNav agent={agent} />
      <GreetingBar name={agent.name} streak={streak} />
      <main className="flex-1">{children}</main>
      <SpotlightTour />
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
