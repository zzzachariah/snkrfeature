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
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_0%,rgba(226,232,240,0.82),transparent_44%),radial-gradient(circle_at_95%_10%,rgba(191,219,254,0.34),transparent_40%)] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(79,70,229,0.26),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(59,130,246,0.18),transparent_40%)]" />
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
