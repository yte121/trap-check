// Turns raw provider responses into the compact dataset the site reads.
// Pure functions: no network, no file system. Tested in tests/normalize.test.mjs.

/** @typedef {{slug:string,name:string,symbol:string,rank:number,price:number,mcap:number,vol:number,circ:number,total:number|null,max:number|null,added:string|null}} Coin */
/** @typedef {{fetchedAt:string,source:string,coins:Coin[]}} Dataset */

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function positive(v) {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
}

/** Make a provider id safe to use as one URL path segment. */
export function toSlug(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

/**
 * CoinGecko `/coins/markets` rows.
 * @param {unknown} rows
 * @returns {Coin[]}
 */
export function normalizeCoinGecko(rows) {
  if (!Array.isArray(rows)) throw new Error("CoinGecko: expected an array of coins");
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const slug = toSlug(row.id);
    const price = positive(row.current_price);
    const mcap = positive(row.market_cap);
    const circ = positive(row.circulating_supply);
    if (!slug || !row.name || !row.symbol || price === null || mcap === null || circ === null) continue;
    out.push({
      slug,
      name: String(row.name).trim(),
      symbol: String(row.symbol).trim().toUpperCase(),
      rank: 0,
      price,
      mcap,
      vol: positive(row.total_volume) ?? 0,
      circ,
      total: positive(row.total_supply),
      max: positive(row.max_supply),
      added: null,
    });
  }
  return out;
}

/**
 * CoinMarketCap `/v1/cryptocurrency/listings/latest` response.
 * @param {unknown} json
 * @returns {Coin[]}
 */
export function normalizeCoinMarketCap(json) {
  const rows = json && typeof json === "object" ? json.data : null;
  if (!Array.isArray(rows)) throw new Error("CoinMarketCap: expected a data array");
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const usd = row.quote && row.quote.USD ? row.quote.USD : null;
    if (!usd) continue;
    const slug = toSlug(row.slug);
    const price = positive(usd.price);
    const mcap = positive(usd.market_cap);
    const circ = positive(row.circulating_supply);
    if (!slug || !row.name || !row.symbol || price === null || mcap === null || circ === null) continue;
    out.push({
      slug,
      name: String(row.name).trim(),
      symbol: String(row.symbol).trim().toUpperCase(),
      rank: 0,
      price,
      mcap,
      vol: positive(usd.volume_24h) ?? 0,
      circ,
      total: positive(row.total_supply),
      // CoinMarketCap marks coins with no cap explicitly.
      max: row.infinite_supply === true ? null : positive(row.max_supply),
      added: typeof row.date_added === "string" ? row.date_added : null,
    });
  }
  return out;
}

/**
 * Sort by market value, drop repeated slugs, number the ranks, cap the length.
 * @param {Coin[]} coins
 * @param {number} limit
 * @returns {Coin[]}
 */
export function finalize(coins, limit = 1000) {
  const seen = new Set();
  const sorted = [...coins].sort((a, b) => b.mcap - a.mcap);
  const out = [];
  for (const coin of sorted) {
    if (seen.has(coin.slug)) continue;
    seen.add(coin.slug);
    out.push({ ...coin, rank: out.length + 1 });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Refuse a dataset that looks wrong, so a provider change or a mapping
 * mistake can never replace good data. Bitcoin's fixed 21 million cap is used
 * as a known answer.
 * @param {Dataset} ds
 * @param {{minCoins?: number}} [opts]
 */
export function validateDataset(ds, opts = {}) {
  const minCoins = opts.minCoins ?? 500;
  const problems = [];
  if (!ds || !Array.isArray(ds.coins)) throw new Error("Dataset has no coins array");
  if (Number.isNaN(Date.parse(ds.fetchedAt))) problems.push("fetchedAt is not a date");
  if (ds.coins.length < minCoins) problems.push(`only ${ds.coins.length} coins, expected at least ${minCoins}`);

  const slugs = new Set();
  for (const c of ds.coins) {
    if (slugs.has(c.slug)) problems.push(`repeated slug ${c.slug}`);
    slugs.add(c.slug);
    if (!(c.price > 0) || !(c.mcap > 0) || !(c.circ > 0)) problems.push(`bad numbers for ${c.slug}`);
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(c.slug)) problems.push(`unsafe slug ${c.slug}`);
    if (problems.length > 10) break;
  }

  const btc = ds.coins.find((c) => c.slug === "bitcoin");
  if (!btc) {
    problems.push("bitcoin is missing");
  } else {
    if (btc.symbol !== "BTC") problems.push(`bitcoin symbol is ${btc.symbol}`);
    if (btc.max !== 21_000_000) problems.push(`bitcoin max supply is ${btc.max}, expected 21000000`);
    if (!(btc.circ > 19_000_000 && btc.circ <= 21_000_000)) problems.push(`bitcoin circulating supply is ${btc.circ}`);
    if (!(btc.price > 1_000 && btc.price < 10_000_000)) problems.push(`bitcoin price is ${btc.price}`);
    // Price times supply must agree with the reported market value.
    const implied = btc.price * btc.circ;
    if (Math.abs(implied - btc.mcap) / btc.mcap > 0.05) problems.push("bitcoin price x supply does not match its market value");
  }

  const eth = ds.coins.find((c) => c.slug === "ethereum");
  if (!eth) {
    problems.push("ethereum is missing");
  } else if (!(eth.circ > 100_000_000 && eth.circ < 200_000_000)) {
    problems.push(`ethereum circulating supply is ${eth.circ}`);
  }

  if (problems.length) throw new Error(`Dataset failed validation: ${problems.join("; ")}`);
  return true;
}

/**
 * One coin per line: small enough to ship, readable in a diff.
 * @param {Dataset} ds
 */
export function serialize(ds) {
  const head = `{"fetchedAt":${JSON.stringify(ds.fetchedAt)},"source":${JSON.stringify(ds.source)},"coins":[\n`;
  return head + ds.coins.map((c) => JSON.stringify(c)).join(",\n") + "\n]}\n";
}

/**
 * The day's circulating supply per coin, kept so supply growth can be measured later.
 * @param {Dataset} ds
 */
export function supplySnapshot(ds) {
  const supply = {};
  for (const c of ds.coins) supply[c.slug] = c.circ;
  return { date: ds.fetchedAt.slice(0, 10), source: ds.source, supply };
}
