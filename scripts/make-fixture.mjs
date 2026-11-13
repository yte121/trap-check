#!/usr/bin/env node
// Builds tests/fixtures/dataset.json: made-up coins for local builds and tests.
// It is marked source "fixture" and the site refuses to build with it on Vercel.

import fs from "node:fs/promises";
import path from "node:path";
import { finalize, normalizeCoinGecko, serialize } from "./lib/normalize.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const raw = JSON.parse(await fs.readFile(path.join(ROOT, "tests/fixtures/coingecko-markets.json"), "utf8"));

// A small fixed-seed generator so the file is the same on every run.
let seed = 20261111;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const extra = [];
for (let i = 1; i <= 990; i++) {
  const max = Math.round(10 ** (6 + rand() * 6));
  const share = Math.min(1, 0.03 + rand() * 1.1);
  const circ = Math.max(1, Math.round(max * share));
  const mcap = Math.round(10 ** (7 + rand() * 3.2));
  const turnover = 10 ** (-3.5 + rand() * 3.2);
  extra.push({
    id: `sample-coin-${String(i).padStart(3, "0")}`,
    symbol: `s${i}`,
    name: `Sample Coin ${i}`,
    current_price: mcap / circ,
    market_cap: mcap,
    total_volume: Math.round(mcap * turnover),
    circulating_supply: circ,
    total_supply: rand() < 0.15 ? null : max,
    max_supply: rand() < 0.3 ? null : max,
  });
}

const coins = finalize(normalizeCoinGecko([...raw, ...extra]), 1000);
const ds = { fetchedAt: "2026-11-11T00:00:00.000Z", source: "fixture", coins };
await fs.writeFile(path.join(ROOT, "tests/fixtures/dataset.json"), serialize(ds));
console.log(`Wrote ${coins.length} made-up coins to tests/fixtures/dataset.json`);
