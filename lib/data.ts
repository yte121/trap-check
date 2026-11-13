import fs from "node:fs";
import path from "node:path";
import { floatCheck, isPegged, runChecks, type Report } from "./checks.ts";
import type { Coin, Dataset } from "./types.ts";

/**
 * The dataset is read once from disk when the site is built. Every page is
 * generated ahead of time from it, so there are no data requests at run time.
 *
 * data/coins.json is written by scripts/fetch-data.mjs. Local builds and tests
 * can set TRAPCHECK_FIXTURE=1 to use made-up coins instead; that is refused on
 * Vercel so test data can never be published.
 */
function load(): Dataset {
  const useFixture = process.env.TRAPCHECK_FIXTURE === "1";
  if (useFixture && process.env.VERCEL) {
    throw new Error("TRAPCHECK_FIXTURE is set on Vercel. Test data must never be deployed.");
  }
  const relative = useFixture ? "tests/fixtures/dataset.json" : "data/coins.json";
  // Both paths are spelled out in full so the bundler traces only these two files.
  const file = useFixture
    ? path.join(process.cwd(), "tests", "fixtures", "dataset.json")
    : path.join(process.cwd(), "data", "coins.json");
  let parsed: Dataset;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Dataset;
  } catch (err) {
    throw new Error(
      `Could not read ${relative}. Run "npm run data" to fetch it, or set TRAPCHECK_FIXTURE=1 for a local build. (${(err as Error).message})`,
    );
  }
  if (!useFixture && parsed.source === "fixture") {
    throw new Error("data/coins.json holds test data. Run \"npm run data -- --force\" to replace it.");
  }
  if (!Array.isArray(parsed.coins) || parsed.coins.length === 0) {
    throw new Error(`${relative} has no coins.`);
  }
  return parsed;
}

const dataset = load();
const bySlug = new Map(dataset.coins.map((coin) => [coin.slug, coin]));
const reports = new Map<string, Report>();

export function getDataset(): Dataset {
  return dataset;
}

export function getCoin(slug: string): Coin | null {
  return bySlug.get(slug) ?? null;
}

export function getReport(coin: Coin): Report {
  let report = reports.get(coin.slug);
  if (!report) {
    report = runChecks(coin);
    reports.set(coin.slug, report);
  }
  return report;
}

export type FloatRow = { coin: Coin; share: number; lockedValue: number };

/**
 * Coins with the smallest share of supply trading, among the largest `within`
 * coins. Pegged coins and coins with no usable supply figure are left out.
 */
export function lowestFloat(within: number, count: number): FloatRow[] {
  const rows: FloatRow[] = [];
  for (const coin of dataset.coins) {
    if (coin.rank > within) continue;
    if (isPegged(coin)) continue;
    const float = floatCheck(coin);
    if (float.share === null || float.inconsistent || float.cap === null) continue;
    rows.push({
      coin,
      share: float.share,
      lockedValue: Math.max(0, float.cap - coin.circ) * coin.price,
    });
  }
  rows.sort((a, b) => a.share - b.share || a.coin.rank - b.coin.rank);
  return rows.slice(0, count);
}

/** The coins just above and below this one by market value, for browsing. */
export function neighbours(coin: Coin): { previous: Coin | null; next: Coin | null } {
  const index = coin.rank - 1;
  return {
    previous: index > 0 ? dataset.coins[index - 1] ?? null : null,
    next: dataset.coins[index + 1] ?? null,
  };
}
