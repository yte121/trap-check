import { getDataset } from "@/lib/data";

// Built once with the site: the compact list the search box filters in the browser.
export const dynamic = "force-static";

export function GET() {
  const rows = getDataset().coins.map((coin) => [coin.slug, coin.name, coin.symbol, coin.rank]);
  return Response.json(rows);
}
