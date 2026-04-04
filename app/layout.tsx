import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { ThemeInitScript } from "@/components/theme/theme-toggle";
import { PageTransition } from "@/components/layout/page-transition";
import { LiquidPointer } from "@/components/theme/liquid-pointer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeInitScript />
        <LiquidPointer />
        <div className="relative min-h-screen">
          <div className="app-ambient-bg pointer-events-none fixed inset-0 -z-10" />
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
