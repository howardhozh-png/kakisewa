import { ThemeReset } from "@/app/(marketing)/theme-reset";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{<ThemeReset />}{children}</>;
}
