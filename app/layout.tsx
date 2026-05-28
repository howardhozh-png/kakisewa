import type { Metadata } from "next";
import { Inter, Geist_Mono, DM_Serif_Display, Caveat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PostHogProvider } from "@/components/posthog-provider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const caveat = Caveat({
  variable: "--font-journal",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "kakisewa — Tenancy CRM",
  description: "AI-powered rent receipt verification for Malaysian landlords",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", geistMono.variable, dmSerif.variable, caveat.variable, "font-sans", inter.variable)}>
      <body className="min-h-full text-foreground antialiased"><PostHogProvider>{children}</PostHogProvider></body>
    </html>
  );
}
