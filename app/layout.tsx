import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { ThemeInitScript } from "@/components/theme/theme-toggle";
import { PageTransition } from "@/components/layout/page-transition";
import { LiquidPointer } from "@/components/theme/liquid-pointer";
import { SiteFooter } from "@/components/layout/site-footer";
import { getLocale } from "@/lib/i18n/get-locale";

export const metadata: Metadata = {
  title: {
    default: "SNKR Feature",
    template: "%s • SNKR Feature",
  },
  description: "Compare sneaker specs, details, and drops in one clean workspace.",
  icons: {
    icon: "/icon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeInitScript />
        <LiquidPointer />
        <div className="relative flex min-h-screen flex-col">
          <div className="app-ambient-bg pointer-events-none fixed inset-0 -z-10" />
          <Navbar />
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
