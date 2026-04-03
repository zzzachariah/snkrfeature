import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { ThemeInitScript } from "@/components/theme/theme-toggle";
import { PageTransition } from "@/components/layout/page-transition";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeInitScript />
        <div className="relative min-h-screen">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.14),transparent_46%)]" />
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
