import type { MetadataRoute } from "next";
import { getDataset } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const { coins, fetchedAt } = getDataset();
  const updated = new Date(fetchedAt);
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${base}/coins`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/method`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/tip`, changeFrequency: "yearly", priority: 0.2 },
    ...coins.map((coin) => ({
      url: `${base}/coin/${coin.slug}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: coin.rank <= 100 ? 0.7 : 0.5,
    })),
  ];
}
