import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/compare", "/search/advanced", "/shoes/"],
      disallow: ["/dashboard", "/submit", "/admin", "/login", "/signup", "/register", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
