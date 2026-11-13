import test from "node:test";
import assert from "node:assert/strict";
import { depthCheck, floatCheck, isPegged, overhangCheck, runChecks, supplyCap, THRESHOLDS } from "../lib/checks.ts";
import { duration, percent, percentParts, price, tokens, tokensShort, usdShort, usdWords, utcStamp, monthYear } from "../lib/format.ts";

function coin(over = {}) {
  return {
    slug: "sample", name: "Sample", symbol: "SMP", rank: 100,
    price: 2, mcap: 200_000_000, vol: 10_000_000,
    circ: 100_000_000, total: 1_000_000_000, max: 1_000_000_000,
    ...over,
  };
}

test("supplyCap prefers the hard cap, then tokens created, then nothing", () => {
  assert.deepEqual(supplyCap(coin()), { cap: 1_000_000_000, basis: "max" });
  assert.deepEqual(supplyCap(coin({ max: null })), { cap: 1_000_000_000, basis: "total" });
  assert.deepEqual(supplyCap(coin({ max: null, total: null })), { cap: null, basis: "none" });
  assert.deepEqual(supplyCap(coin({ max: 0, total: 5 })), { cap: 5, basis: "total" });
});

test("float: 10% trading raises a flag", () => {
  const r = floatCheck(coin());
  assert.equal(r.level, "flag");
  assert.equal(r.share, 0.1);
});

test("float: the bands change exactly at 20% and 50%", () => {
  assert.equal(floatCheck(coin({ circ: 199_999_999 })).level, "flag");
  assert.equal(floatCheck(coin({ circ: 200_000_000 })).level, "watch");
  assert.equal(floatCheck(coin({ circ: 499_999_999 })).level, "watch");
  assert.equal(floatCheck(coin({ circ: 500_000_000 })).level, "none");
  assert.equal(THRESHOLDS.floatFlag, 0.2);
  assert.equal(THRESHOLDS.floatWatch, 0.5);
});

test("float: bitcoin-like supply raises nothing", () => {
  const r = floatCheck(coin({ circ: 20_110_000, total: 20_110_000, max: 21_000_000 }));
  assert.equal(r.level, "none");
  assert.ok(Math.abs(r.share - 0.9576) < 0.001);
});

test("float: unknown supply is a watch, never a pass", () => {
  const r = floatCheck(coin({ max: null, total: null }));
  assert.equal(r.level, "watch");
  assert.equal(r.share, null);
});

test("float: more trading than the cap is capped at 100% and marked inconsistent", () => {
  const r = floatCheck(coin({ circ: 110_000_000, total: 100_000_000, max: 100_000_000 }));
  assert.equal(r.share, 1);
  assert.equal(r.inconsistent, true);
  assert.equal(r.level, "watch");
});

test("float: a rounding-sized overshoot is not called inconsistent", () => {
  const r = floatCheck(coin({ circ: 100_500_000, total: 100_000_000, max: 100_000_000 }));
  assert.equal(r.inconsistent, false);
  assert.equal(r.level, "none");
});

test("overhang: locked value and days of volume", () => {
  // 900M locked x $2 = $1.8B; $10M a day -> 180 days
  const r = overhangCheck(coin());
  assert.equal(r.lockedTokens, 900_000_000);
  assert.equal(r.lockedValue, 1_800_000_000);
  assert.equal(r.daysOfVolume, 180);
  assert.equal(r.level, "watch");
});

test("overhang: the bands change just above 90 and 365 days", () => {
  // lockedValue is $1.8B, so volume sets the number of days.
  assert.equal(overhangCheck(coin({ vol: 1_800_000_000 / 90 })).level, "none");
  assert.equal(overhangCheck(coin({ vol: 1_800_000_000 / 91 })).level, "watch");
  assert.equal(overhangCheck(coin({ vol: 1_800_000_000 / 365 })).level, "watch");
  assert.equal(overhangCheck(coin({ vol: 1_800_000_000 / 366 })).level, "flag");
});

test("overhang: nothing left to release is a clean result", () => {
  const r = overhangCheck(coin({ circ: 1_000_000_000 }));
  assert.deepEqual(r, { level: "none", lockedTokens: 0, lockedValue: 0, daysOfVolume: 0 });
});

test("overhang: locked tokens with no trading at all raise a flag", () => {
  const r = overhangCheck(coin({ vol: 0 }));
  assert.equal(r.level, "flag");
  assert.equal(r.daysOfVolume, null);
});

test("overhang: unknown supply is a watch", () => {
  assert.equal(overhangCheck(coin({ max: null, total: null })).level, "watch");
});

test("overhang: supply above the cap never gives a negative number", () => {
  const r = overhangCheck(coin({ circ: 1_100_000_000 }));
  assert.equal(r.lockedTokens, 0);
  assert.equal(r.level, "none");
});

test("depth: bitcoin-like trading raises nothing", () => {
  const r = depthCheck(coin({ mcap: 1_468_030_000_000, vol: 28_800_000_000 }));
  assert.equal(r.level, "none");
  assert.equal(r.reason, "ok");
});

test("depth: tiny volume is a flag even when the share looks fine", () => {
  const r = depthCheck(coin({ mcap: 1_000_000, vol: 50_000 }));
  assert.equal(r.level, "flag");
  assert.equal(r.reason, "very-thin");
});

test("depth: a large coin that barely trades is a flag", () => {
  const r = depthCheck(coin({ mcap: 4_000_000_000, vol: 2_000_000 }));
  assert.equal(r.level, "flag");
});

test("depth: thin trading is a watch", () => {
  assert.equal(depthCheck(coin({ mcap: 200_000_000, vol: 800_000 })).reason, "thin");
  assert.equal(depthCheck(coin({ mcap: 1_000_000_000, vol: 4_000_000 })).reason, "thin");
});

test("depth: trading more than the whole market value in a day is a watch", () => {
  const r = depthCheck(coin({ mcap: 20_000_000, vol: 45_000_000 }));
  assert.equal(r.level, "watch");
  assert.equal(r.reason, "hot");
});

test("depth: no volume is a flag, missing market value is a watch", () => {
  assert.equal(depthCheck(coin({ vol: 0 })).level, "flag");
  assert.equal(depthCheck(coin({ mcap: 0 })).level, "watch");
});

test("runChecks counts flags and watches", () => {
  const r = runChecks(coin());
  assert.equal(r.float.level, "flag");
  assert.equal(r.overhang.level, "watch");
  assert.equal(r.depth.level, "none");
  assert.equal(r.flags, 1);
  assert.equal(r.watches, 1);
});

test("pegged coins are recognised by symbol, in any case", () => {
  assert.equal(isPegged(coin({ symbol: "USDT" })), true);
  assert.equal(isPegged(coin({ symbol: "usdc" })), true);
  assert.equal(isPegged(coin({ symbol: "BTC" })), false);
});

test("usdShort and usdWords scale and round", () => {
  assert.equal(usdShort(1_468_030_000_000), "$1.47T");
  assert.equal(usdShort(248_100_000_000), "$248B");
  assert.equal(usdShort(12_340_000), "$12.3M");
  assert.equal(usdShort(950_000), "$950K");
  assert.equal(usdShort(42), "$42");
  assert.equal(usdShort(999_960), "$1M", "never prints 1000K");
  assert.equal(usdShort(null), "not published");
  assert.equal(usdWords(1_800_000_000), "$1.8 billion");
  assert.equal(usdWords(999_999_999), "$1 billion", "never prints 1000 million");
});

test("price keeps useful digits at every size", () => {
  assert.equal(price(72981.52), "$72,982");
  assert.equal(price(2039.25), "$2,039");
  assert.equal(price(82.24), "$82.24");
  assert.equal(price(1.05), "$1.05");
  assert.equal(price(0.06668), "$0.06668");
  assert.equal(price(0.004558), "$0.004558");
  assert.equal(price(0.0000046), "$0.0000046");
  assert.equal(price(0), "not published");
});

test("tokens in words and short form", () => {
  assert.equal(tokens(20_110_000), "20.1 million");
  assert.equal(tokens(1_000_000_000), "1 billion");
  assert.equal(tokens(420_690_000_000_000), "421 trillion");
  assert.equal(tokensShort(80_000_000), "80M");
  assert.equal(tokens(null), "not published");
});

test("percent never rounds a small share to zero or a near-full one to 100", () => {
  assert.equal(percent(0.1), "10%");
  assert.equal(percent(0.08), "8%");
  assert.equal(percent(0.042), "4.2%");
  assert.equal(percent(0.004), "0.4%");
  assert.equal(percent(0.0004), "under 0.1%");
  assert.equal(percent(0.9576), "96%");
  assert.equal(percent(0.998), "over 99%");
  assert.equal(percent(1), "100%");
  assert.equal(percent(null), "unknown");
  assert.deepEqual(percentParts(0.08), { qualifier: null, value: "8" });
  assert.deepEqual(percentParts(0.042), { qualifier: null, value: "4.2" });
  assert.deepEqual(percentParts(0.0004), { qualifier: "under", value: "0.1" });
  assert.deepEqual(percentParts(0.998), { qualifier: "over", value: "99" });
  assert.deepEqual(percentParts(1), { qualifier: null, value: "100" });
  assert.equal(percentParts(null), null);
});

test("duration reads as days, then years", () => {
  assert.equal(duration(0.4), "under a day");
  assert.equal(duration(1.2), "about a day");
  assert.equal(duration(180), "about 180 days");
  assert.equal(duration(900), "about 2.5 years");
  assert.equal(duration(365 * 12), "about 12 years");
  assert.equal(duration(365 * 400), "over 100 years");
  assert.equal(duration(null), "unknown");
});

test("dates print in UTC whatever the machine's time zone", () => {
  assert.equal(utcStamp("2026-11-11T03:10:45.000Z"), "11 Nov 2026, 03:10 UTC");
  assert.equal(utcStamp("nonsense"), "unknown time");
  assert.equal(monthYear("2010-07-13T00:00:00.000Z"), "Jul 2010");
  assert.equal(monthYear(null), null);
});
