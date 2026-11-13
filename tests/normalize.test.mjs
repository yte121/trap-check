import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  finalize,
  normalizeCoinGecko,
  normalizeCoinMarketCap,
  serialize,
  supplySnapshot,
  toSlug,
  validateDataset,
} from "../scripts/lib/normalize.mjs";

const fixtures = path.join(import.meta.dirname, "fixtures");
const cgRows = JSON.parse(fs.readFileSync(path.join(fixtures, "coingecko-markets.json"), "utf8"));
const cmcJson = JSON.parse(fs.readFileSync(path.join(fixtures, "cmc-listings.json"), "utf8"));

test("toSlug keeps safe ids and cleans unsafe ones", () => {
  assert.equal(toSlug("bitcoin"), "bitcoin");
  assert.equal(toSlug("usd-coin"), "usd-coin");
  assert.equal(toSlug("Sample Odd/ID!"), "sample-odd-id");
  assert.equal(toSlug("--weird..id--"), "weird..id");
  assert.equal(toSlug(null), "");
});

test("CoinGecko rows map to the compact shape", () => {
  const coins = normalizeCoinGecko(cgRows);
  const btc = coins.find((c) => c.slug === "bitcoin");
  assert.deepEqual(btc, {
    slug: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    rank: 0,
    price: 73000,
    mcap: 1468030000000,
    vol: 28800000000,
    circ: 20110000,
    total: 20110000,
    max: 21000000,
    added: null,
  });
  const eth = coins.find((c) => c.slug === "ethereum");
  assert.equal(eth.max, null, "a missing max supply stays null");
});

test("CoinGecko rows with missing essentials are dropped", () => {
  const coins = normalizeCoinGecko(cgRows);
  assert.equal(coins.some((c) => c.slug === "sample-no-market-cap"), false);
});

test("CoinGecko numeric strings are read as numbers and names are trimmed", () => {
  const odd = normalizeCoinGecko(cgRows).find((c) => c.slug === "sample-odd-id");
  assert.equal(odd.name, "Sample Odd Id");
  assert.equal(odd.symbol, "SODD");
  assert.equal(odd.price, 1.5);
  assert.equal(odd.max, 20000000);
});

test("zero volume is kept as zero, not dropped", () => {
  const coin = normalizeCoinGecko(cgRows).find((c) => c.slug === "sample-no-volume");
  assert.equal(coin.vol, 0);
});

test("CoinMarketCap rows map to the same shape", () => {
  const coins = normalizeCoinMarketCap(cmcJson);
  const btc = coins.find((c) => c.slug === "bitcoin");
  assert.deepEqual(btc, {
    slug: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    rank: 0,
    price: 73000,
    mcap: 1468030000000,
    vol: 28800000000,
    circ: 20110000,
    total: 20110000,
    max: 21000000,
    added: "2010-07-13T00:00:00.000Z",
  });
});

test("CoinMarketCap infinite supply overrides a stated max", () => {
  const coins = normalizeCoinMarketCap(cmcJson);
  assert.equal(coins.find((c) => c.slug === "ethereum").max, null);
  assert.equal(coins.find((c) => c.slug === "sample-infinite-with-max").max, null);
});

test("CoinMarketCap rows without a USD quote are dropped", () => {
  const coins = normalizeCoinMarketCap(cmcJson);
  assert.equal(coins.some((c) => c.slug === "sample-no-quote"), false);
});

test("both providers give the same numbers for the same coin", () => {
  const a = normalizeCoinGecko(cgRows).find((c) => c.slug === "sample-low-float");
  const b = normalizeCoinMarketCap(cmcJson).find((c) => c.slug === "sample-low-float");
  for (const key of ["price", "mcap", "vol", "circ", "total", "max"]) {
    assert.equal(a[key], b[key], key);
  }
});

test("finalize sorts by market value, ranks from 1 and drops repeated slugs", () => {
  const coins = finalize(normalizeCoinGecko(cgRows));
  assert.equal(coins[0].slug, "bitcoin");
  assert.equal(coins[0].rank, 1);
  assert.equal(coins[0].name, "Bitcoin", "the larger of two rows with one slug wins");
  assert.equal(coins.filter((c) => c.slug === "bitcoin").length, 1);
  assert.deepEqual(coins.map((c) => c.rank), coins.map((_, i) => i + 1));
  for (let i = 1; i < coins.length; i++) assert.ok(coins[i - 1].mcap >= coins[i].mcap);
});

test("finalize respects the limit", () => {
  assert.equal(finalize(normalizeCoinGecko(cgRows), 3).length, 3);
});

function goodDataset() {
  return { fetchedAt: "2026-11-11T00:00:00.000Z", source: "coingecko", coins: finalize(normalizeCoinGecko(cgRows)) };
}

test("a sound dataset passes validation", () => {
  assert.equal(validateDataset(goodDataset(), { minCoins: 5 }), true);
});

test("validation refuses a short list", () => {
  assert.throws(() => validateDataset(goodDataset()), /expected at least 500/);
});

test("validation refuses a wrong bitcoin cap, which would mean the fields are mapped wrongly", () => {
  const ds = goodDataset();
  ds.coins.find((c) => c.slug === "bitcoin").max = 20110000;
  assert.throws(() => validateDataset(ds, { minCoins: 5 }), /bitcoin max supply/);
});

test("validation refuses a bitcoin price that does not match its market value", () => {
  const ds = goodDataset();
  ds.coins.find((c) => c.slug === "bitcoin").price = 7300;
  assert.throws(() => validateDataset(ds, { minCoins: 5 }), /does not match its market value/);
});

test("validation refuses a dataset without bitcoin or ethereum", () => {
  const ds = goodDataset();
  ds.coins = ds.coins.filter((c) => c.slug !== "bitcoin" && c.slug !== "ethereum");
  assert.throws(() => validateDataset(ds, { minCoins: 5 }), /bitcoin is missing.*ethereum is missing/);
});

test("validation refuses unsafe slugs and bad numbers", () => {
  const ds = goodDataset();
  ds.coins[3].slug = "../etc";
  ds.coins[4].price = 0;
  assert.throws(() => validateDataset(ds, { minCoins: 5 }), /unsafe slug|bad numbers/);
});

test("serialize round-trips and keeps one coin per line", () => {
  const ds = goodDataset();
  const text = serialize(ds);
  assert.deepEqual(JSON.parse(text), ds);
  assert.equal(text.trim().split("\n").length, ds.coins.length + 2);
});

test("supplySnapshot records circulating supply by slug for the day", () => {
  const snap = supplySnapshot(goodDataset());
  assert.equal(snap.date, "2026-11-11");
  assert.equal(snap.supply.bitcoin, 20110000);
});
