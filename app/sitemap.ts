import type { MetadataRoute } from "next";
import { getShoes } from "@/lib/data/shoes";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shoes = await getShoes();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/compare`, lastModified: now },
    { url: `${SITE_URL}/search/advanced`, lastModified: now },
  ];

  const shoePages: MetadataRoute.Sitemap = shoes.map((shoe) => ({
    url: `${SITE_URL}/shoes/${shoe.slug}`,
    lastModified: now,
  }));

  return [...staticPages, ...shoePages];
}
