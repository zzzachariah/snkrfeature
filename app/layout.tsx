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
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.44),transparent_42%),radial-gradient(circle_at_95%_8%,rgba(148,163,184,0.22),transparent_38%)] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(129,140,248,0.24),transparent_42%),radial-gradient(circle_at_90%_6%,rgba(99,102,241,0.18),transparent_40%)]" />
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
