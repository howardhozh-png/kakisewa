import { OnboardingDemoModal } from "@/components/onboarding-demo-modal";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
      {children}
      <OnboardingDemoModal />
    </>
  );
}
