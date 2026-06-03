import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, DM_Serif_Display, Caveat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PostHogProvider } from "@/components/posthog-provider";
import { PwaRegister } from "@/components/pwa-register";

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
  title: "kakisewa",
  description: "kakisewa, #1 property agent platform",
  openGraph: {
    title: "kakisewa",
    description: "kakisewa, #1 property agent platform",
    siteName: "kakisewa",
  },
  twitter: {
    card: "summary",
    title: "kakisewa",
    description: "kakisewa, #1 property agent platform",
  },
  icons: {
    apple: [{ url: "/pwa-icon/180?v=10", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "kakisewa",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", geistMono.variable, dmSerif.variable, caveat.variable, "font-sans", inter.variable)}>
      <body className="min-h-full text-foreground antialiased"><PostHogProvider>{children}</PostHogProvider><PwaRegister /></body>
    </html>
  );
}
