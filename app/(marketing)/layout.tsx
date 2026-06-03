import { Suspense } from "react";
import { OnboardingDemoModal } from "@/components/onboarding-demo-modal";
import { LandingInstallPrompt } from "@/components/landing-install-prompt";
import { AuthCodeRedirect } from "./auth-code-redirect";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
      <Suspense><AuthCodeRedirect /></Suspense>
      {children}
      <OnboardingDemoModal autoOpen={false} />
      <LandingInstallPrompt />
    </>
  );
}
