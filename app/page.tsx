import { HomeTable } from "@/components/home/home-table";
import { HomeHero } from "@/components/home/home-hero";
import { getShoes } from "@/lib/data/shoes";
import type { Metadata } from "next";
import { absoluteUrl, DEFAULT_OG_IMAGE_URL, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: absoluteUrl("/"),
    images: [{ url: DEFAULT_OG_IMAGE_URL }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_URL],
  },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const shoes = await getShoes();
  const brands = new Set(shoes.map((s) => s.brand)).size;

  return (
    <main className="container-shell space-y-16 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "SNKR Feature",
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/search/advanced")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <HomeHero shoesCount={shoes.length} brandsCount={brands} />

      <HomeTable shoes={shoes} initialQuery={q ?? ""} />
    </main>
  );
}
