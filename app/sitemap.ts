import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date("2026-04-10T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
