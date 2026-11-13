import type { DataSource } from "./types.ts";

export const SITE_NAME = "Trap Check";

export const SITE_TAGLINE = "See how much of a coin is actually trading before you buy.";

/**
 * Public Solana address that receives tips. A public address is safe to
 * publish; no private key or seed phrase is ever stored in this project.
 */
export const TIP_ADDRESS = "4nZfMApb7Zc6ZSeyAX3grLxcURiPSToWL3r6BvbobmWs";

/** Where the site lives, used for canonical links and the sitemap. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;
  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}

export const SOURCES: Record<DataSource, { name: string; url: string | null }> = {
  coingecko: { name: "CoinGecko", url: "https://www.coingecko.com/" },
  coinmarketcap: { name: "CoinMarketCap", url: "https://coinmarketcap.com/" },
  fixture: { name: "made-up test data", url: null },
};
