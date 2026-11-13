#!/usr/bin/env node
// Fetches the coin list and writes data/coins.json plus a dated supply snapshot.
//
//   node scripts/fetch-data.mjs                    refresh if the data is older than 20 hours
//   node scripts/fetch-data.mjs --force            always refresh
//   node scripts/fetch-data.mjs --max-age-hours=6  refresh if older than 6 hours
//
// Source: CoinMarketCap when CMC_API_KEY is set, otherwise CoinGecko's public API
// (COINGECKO_API_KEY is used if present). If the fetch fails and good data is
// already on disk, the old data is kept and the script exits cleanly.

import fs from "node:fs/promises";
import path from "node:path";
import {
  finalize,
  normalizeCoinGecko,
  normalizeCoinMarketCap,
  serialize,
  supplySnapshot,
  validateDataset,
} from "./lib/normalize.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "coins.json");
const HISTORY_DIR = path.join(ROOT, "data", "history");
const COIN_LIMIT = 1000;
const USER_AGENT = "trap-check/0.1 (supply checks; github.com/yte121/trap-check)";

function arg(name, fallback = null) {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET JSON with a timeout and patient retries on rate limits and server errors. */
async function getJson(url, headers, label) {
  const maxAttempts = 5;
  let lastError = new Error(`${label}: failed`);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Network errors and bad JSON get a short wait; rate limits get a longer one.
    let wait = attempt * 5_000;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return await res.json();
      const body = (await res.text()).slice(0, 200).replace(/\s+/g, " ");
      lastError = new Error(`${label}: HTTP ${res.status} ${body}`);
      // A 4xx other than "too many requests" will not fix itself: stop now.
      if (res.status !== 429 && res.status < 500) {
        lastError.fatal = true;
        throw lastError;
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 120) * 1000 : attempt * 15_000;
    } catch (err) {
      if (err && err.fatal) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxAttempts) {
      console.log(`  ${lastError.message}; waiting ${Math.round(wait / 1000)}s (attempt ${attempt} of ${maxAttempts})`);
      await sleep(wait);
    }
  }
  throw lastError;
}

async function fromCoinMarketCap(key) {
  const url =
    "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest" +
    `?start=1&limit=${COIN_LIMIT}&convert=USD&sort=market_cap` +
    "&aux=date_added,max_supply,circulating_supply,total_supply,cmc_rank";
  const json = await getJson(url, { "X-CMC_PRO_API_KEY": key }, "CoinMarketCap");
  return normalizeCoinMarketCap(json);
}

async function fromCoinGecko(key) {
  const perPage = 250;
  const pages = Math.ceil(COIN_LIMIT / perPage);
  const headers = key ? { "x-cg-demo-api-key": key } : {};
  // The keyless API allows only a handful of calls a minute, so pages are spaced out.
  const gap = key ? 2_500 : 13_000;
  const coins = [];
  for (let page = 1; page <= pages; page++) {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
    const rows = await getJson(url, headers, `CoinGecko page ${page}`);
    coins.push(...normalizeCoinGecko(rows));
    console.log(`  CoinGecko page ${page} of ${pages}: ${coins.length} coins so far`);
    if (page < pages) await sleep(gap);
  }
  return coins;
}

async function fetchDataset() {
  const cmcKey = process.env.CMC_API_KEY?.trim();
  const cgKey = process.env.COINGECKO_API_KEY?.trim();
  const forced = arg("source");
  const attempts = [];
  if (cmcKey && forced !== "coingecko") attempts.push(["coinmarketcap", () => fromCoinMarketCap(cmcKey)]);
  if (forced !== "coinmarketcap") attempts.push(["coingecko", () => fromCoinGecko(cgKey)]);
  if (!attempts.length) throw new Error("No data source available: set CMC_API_KEY or allow CoinGecko");

  let lastError = null;
  for (const [source, run] of attempts) {
    try {
      console.log(`Fetching from ${source}...`);
      const coins = finalize(await run(), COIN_LIMIT);
      const ds = { fetchedAt: new Date().toISOString(), source, coins };
      validateDataset(ds);
      return ds;
    } catch (err) {
      lastError = err;
      console.log(`${source} failed: ${err.message}`);
    }
  }
  throw lastError;
}

async function readExisting() {
  try {
    const ds = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    if (ds.source === "fixture") return null;
    validateDataset(ds);
    return ds;
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.TRAPCHECK_FIXTURE === "1") {
    if (process.env.VERCEL) throw new Error("TRAPCHECK_FIXTURE must not be set on Vercel");
    console.log("TRAPCHECK_FIXTURE=1: using test data, skipping the fetch.");
    return;
  }

  const force = arg("force") === true;
  const maxAgeHours = Number(arg("max-age-hours", "20"));
  const existing = await readExisting();

  if (existing && !force) {
    const ageHours = (Date.now() - Date.parse(existing.fetchedAt)) / 3_600_000;
    if (ageHours < maxAgeHours) {
      console.log(`Data is ${ageHours.toFixed(1)} hours old (${existing.coins.length} coins from ${existing.source}); no fetch needed.`);
      return;
    }
  }

  let ds;
  try {
    ds = await fetchDataset();
  } catch (err) {
    if (existing) {
      console.log(`Fetch failed (${err.message}). Keeping the data from ${existing.fetchedAt}.`);
      return;
    }
    console.error(`Fetch failed and there is no earlier data to fall back on: ${err.message}`);
    process.exit(1);
  }

  await fs.mkdir(HISTORY_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, serialize(ds));
  const snap = supplySnapshot(ds);
  await fs.writeFile(path.join(HISTORY_DIR, `${snap.date}.json`), JSON.stringify(snap) + "\n");
  console.log(`Wrote ${ds.coins.length} coins from ${ds.source} at ${ds.fetchedAt}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
