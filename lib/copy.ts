import type { DepthResult, FloatResult, Level, OverhangResult, Report } from "./checks.ts";
import { duration, percent, tokens, usdWords } from "./format.ts";
import type { Coin } from "./types.ts";

/** The sentences on a coin's label. Kept apart from the markup so the wording can be tested and changed in one place. */

export const STAMP_WORDS: Record<Level, string> = {
  flag: "Flag",
  watch: "Watch",
  none: "No flag",
};

export function floatSentence(coin: Coin, float: FloatResult): string {
  const sym = coin.symbol;
  if (float.share === null || float.cap === null) {
    return `The total supply of ${sym} is not published, so the share that is trading cannot be worked out.`;
  }
  if (float.inconsistent) {
    return `The data shows more ${sym} trading than its stated supply allows. Treat these supply numbers with care.`;
  }
  const rest = 1 - float.share;
  if (float.basis === "max") {
    if (rest < 0.001) return `Almost every ${sym} that can ever exist is already trading.`;
    return `${tokens(coin.circ)} of a maximum ${tokens(float.cap)} ${sym} are trading. The other ${percent(rest)} has not reached the market yet.`;
  }
  const noCap = "No maximum supply is published, so more could be created.";
  if (rest < 0.001) return `Every ${sym} created so far is trading. ${noCap}`;
  return `${tokens(coin.circ)} of the ${tokens(float.cap)} ${sym} created so far are trading. ${noCap}`;
}

export function floatReason(float: FloatResult): string | null {
  if (float.share === null || float.inconsistent) return null;
  if (float.level === "flag") return "Under 20% is trading. Most of the supply can still arrive and weigh on the price.";
  if (float.level === "watch") return "Less than half is trading.";
  return null;
}

export function overhangSentence(coin: Coin, overhang: OverhangResult): string {
  if (overhang.lockedValue === null) {
    return "This cannot be worked out without a published supply.";
  }
  if (overhang.lockedValue === 0) {
    return "Nothing is left to release under the published supply.";
  }
  const worth = `Tokens that are not trading yet are worth ${usdWords(overhang.lockedValue)} at today’s price.`;
  if (overhang.daysOfVolume === null) {
    return `${worth} No trading in ${coin.symbol} was recorded in the last 24 hours.`;
  }
  return `${worth} That is ${duration(overhang.daysOfVolume)} of trading at today’s pace.`;
}

export function overhangReason(overhang: OverhangResult): string | null {
  if (overhang.lockedValue === null || overhang.lockedValue === 0) return null;
  if (overhang.daysOfVolume === null) return "There are tokens waiting and no buyers on record.";
  if (overhang.level === "flag") return "More than a year of today’s trading would be needed to absorb it.";
  if (overhang.level === "watch") return "More than three months of today’s trading would be needed to absorb it.";
  return null;
}

export function depthSentence(coin: Coin, depth: DepthResult): string {
  if (depth.turnover === null) {
    return "The market value is not published, so trading cannot be compared with it.";
  }
  if (!(coin.vol > 0)) {
    return `No trading in ${coin.symbol} was recorded in the last 24 hours.`;
  }
  return `${usdWords(coin.vol)} of ${coin.symbol} traded in the last 24 hours, ${percent(depth.turnover)} of its market value.`;
}

export function depthReason(depth: DepthResult): string | null {
  switch (depth.reason) {
    case "very-thin":
      return "That is very little. Selling even a small amount could move the price.";
    case "thin":
      return "That is thin for a coin of this size.";
    case "hot":
      return "More than its whole market value changed hands in a day. That can be hype or artificial trading.";
    default:
      return null;
  }
}

export function tally(report: Report): string {
  const flags = report.flags === 1 ? "1 flag" : `${report.flags} flags`;
  if (report.flags === 0 && report.watches === 0) return "No flags in 3 checks";
  if (report.watches === 0) return `${flags} in 3 checks`;
  return `${flags}, ${report.watches} to watch, in 3 checks`;
}

export const CAVEAT =
  "No flag does not mean safe. These checks look only at supply and trading, not at the project, its team or its release dates.";

/** One sentence for search results and link previews. */
export function summary(coin: Coin, report: Report): string {
  const share = report.float.share;
  const lead =
    share === null
      ? `${coin.name} (${coin.symbol}) does not publish a total supply.`
      : `${percent(share)} of ${coin.name} (${coin.symbol}) supply is trading.`;
  return `${lead} ${tally(report)}. Plain-word supply check, updated daily.`;
}
