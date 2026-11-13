import type { Coin } from "./types.ts";

/**
 * The three supply checks. Pure functions, no I/O, so they can be tested
 * directly with `node --test`.
 *
 * Levels:
 *  - "flag"  the check found something a buyer should look into first
 *  - "watch" worth knowing, or the data is missing
 *  - "none"  this check found nothing. That is not the same as safe.
 */
export type Level = "flag" | "watch" | "none";

export const THRESHOLDS = {
  /** Share of supply trading below which the float check raises a flag. */
  floatFlag: 0.2,
  /** Share of supply trading below which the float check says watch. */
  floatWatch: 0.5,
  /** Days of trading volume needed to absorb locked tokens: flag above this. */
  overhangFlagDays: 365,
  /** Days of trading volume needed to absorb locked tokens: watch above this. */
  overhangWatchDays: 90,
  /** Daily volume in dollars below which trading is called very thin. */
  volumeFlag: 100_000,
  /** Daily volume in dollars below which trading is called thin. */
  volumeWatch: 1_000_000,
  /** Daily volume as a share of market value below which trading is very thin. */
  turnoverFlag: 0.002,
  /** Daily volume as a share of market value below which trading is thin. */
  turnoverWatch: 0.005,
  /** Daily volume above this share of market value is unusually heavy. */
  turnoverHot: 1,
} as const;

export type SupplyBasis = "max" | "total" | "none";

export type SupplyCap = {
  /** The supply figure the checks measure against, or null if none is published. */
  cap: number | null;
  /** Which published figure the cap came from. */
  basis: SupplyBasis;
};

function positive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** The largest supply the provider publishes: the hard cap if there is one, else tokens created so far. */
export function supplyCap(coin: Coin): SupplyCap {
  if (positive(coin.max)) return { cap: coin.max, basis: "max" };
  if (positive(coin.total)) return { cap: coin.total, basis: "total" };
  return { cap: null, basis: "none" };
}

export type FloatResult = {
  level: Level;
  /** Share of the cap that is trading, 0 to 1. Null when it cannot be worked out. */
  share: number | null;
  cap: number | null;
  basis: SupplyBasis;
  /** True when the provider reports more tokens trading than the cap allows. */
  inconsistent: boolean;
};

export function floatCheck(coin: Coin): FloatResult {
  const { cap, basis } = supplyCap(coin);
  if (cap === null || !positive(coin.circ)) {
    return { level: "watch", share: null, cap, basis, inconsistent: false };
  }
  const raw = coin.circ / cap;
  const inconsistent = raw > 1.01;
  const share = Math.min(1, raw);
  let level: Level = "none";
  if (share < THRESHOLDS.floatFlag) level = "flag";
  else if (share < THRESHOLDS.floatWatch) level = "watch";
  if (inconsistent) level = "watch";
  return { level, share, cap, basis, inconsistent };
}

export type OverhangResult = {
  level: Level;
  /** Tokens under the cap that are not trading yet. Null when the cap is unknown. */
  lockedTokens: number | null;
  /** Dollar value of those tokens at today's price. */
  lockedValue: number | null;
  /** lockedValue divided by 24-hour volume. Null when there is no volume or no cap. */
  daysOfVolume: number | null;
};

export function overhangCheck(coin: Coin): OverhangResult {
  const { cap } = supplyCap(coin);
  if (cap === null || !positive(coin.circ) || !positive(coin.price)) {
    return { level: "watch", lockedTokens: null, lockedValue: null, daysOfVolume: null };
  }
  const lockedTokens = Math.max(0, cap - coin.circ);
  const lockedValue = lockedTokens * coin.price;
  // Under 0.1% of the cap left is treated as nothing left to release.
  if (lockedTokens / cap < 0.001) {
    return { level: "none", lockedTokens: 0, lockedValue: 0, daysOfVolume: 0 };
  }
  if (!positive(coin.vol)) {
    return { level: "flag", lockedTokens, lockedValue, daysOfVolume: null };
  }
  const daysOfVolume = lockedValue / coin.vol;
  let level: Level = "none";
  if (daysOfVolume > THRESHOLDS.overhangFlagDays) level = "flag";
  else if (daysOfVolume > THRESHOLDS.overhangWatchDays) level = "watch";
  return { level, lockedTokens, lockedValue, daysOfVolume };
}

export type DepthReason = "ok" | "very-thin" | "thin" | "hot" | "unknown";

export type DepthResult = {
  level: Level;
  /** 24-hour volume divided by market value. Null when market value is missing. */
  turnover: number | null;
  reason: DepthReason;
};

export function depthCheck(coin: Coin): DepthResult {
  if (!positive(coin.mcap)) {
    return { level: "watch", turnover: null, reason: "unknown" };
  }
  const vol = positive(coin.vol) ? coin.vol : 0;
  const turnover = vol / coin.mcap;
  if (vol < THRESHOLDS.volumeFlag || turnover < THRESHOLDS.turnoverFlag) {
    return { level: "flag", turnover, reason: "very-thin" };
  }
  if (vol < THRESHOLDS.volumeWatch || turnover < THRESHOLDS.turnoverWatch) {
    return { level: "watch", turnover, reason: "thin" };
  }
  if (turnover > THRESHOLDS.turnoverHot) {
    return { level: "watch", turnover, reason: "hot" };
  }
  return { level: "none", turnover, reason: "ok" };
}

export type Report = {
  float: FloatResult;
  overhang: OverhangResult;
  depth: DepthResult;
  flags: number;
  watches: number;
};

export function runChecks(coin: Coin): Report {
  const float = floatCheck(coin);
  const overhang = overhangCheck(coin);
  const depth = depthCheck(coin);
  const levels = [float.level, overhang.level, depth.level];
  return {
    float,
    overhang,
    depth,
    flags: levels.filter((l) => l === "flag").length,
    watches: levels.filter((l) => l === "watch").length,
  };
}

/**
 * Coins that aim to hold a fixed price. The supply checks say little about
 * whether they will keep doing so, and they are left out of ranked lists.
 */
const PEGGED_SYMBOLS = new Set([
  "USDT", "USDC", "DAI", "USDS", "USDE", "FDUSD", "PYUSD", "TUSD", "USDD",
  "RLUSD", "USD1", "USDG", "USD0", "BUSD", "GUSD", "USDP", "FRAX", "LUSD",
  "EURC", "EURS", "EURT", "XAUT", "PAXG", "BSC-USD", "USDT0", "USDTB", "USDF",
  "SUSDE", "SUSDS", "BUIDL", "USYC", "USDY", "OUSG",
]);

export function isPegged(coin: Coin): boolean {
  return PEGGED_SYMBOLS.has(coin.symbol.toUpperCase());
}
