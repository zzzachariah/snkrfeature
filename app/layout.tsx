import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { ThemeInitScript } from "@/components/theme/theme-toggle";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { Analytics } from "@vercel/analytics/next";
import { DEFAULT_OG_IMAGE_URL, HOME_DESCRIPTION, HOME_TITLE, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s",
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE_URL }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  icons: {
    icon: "/icon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeInitScript />
        <LocaleProvider>
        <div className="relative flex min-h-screen flex-col">
          <div className="app-ambient-bg pointer-events-none fixed inset-0 -z-10" />
          <Navbar />
          <div className="flex-1">{children}</div>
        </div>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
