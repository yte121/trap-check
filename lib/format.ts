/** Plain-word number formatting. Pure functions so they can be tested directly. */

type Unit = [size: number, word: string];

const WORD_UNITS: Unit[] = [
  [1e12, "trillion"],
  [1e9, "billion"],
  [1e6, "million"],
  [1e3, "thousand"],
];

const SHORT_UNITS: Unit[] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

/** Fixed decimals with trailing zeros removed: 12.30 -> "12.3", 12.00 -> "12". */
function trim(n: number, digits: number): string {
  return n
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

function digitsFor(v: number): number {
  return v >= 100 ? 0 : v >= 10 ? 1 : 2;
}

/**
 * Scale a number of 1,000 or more to a unit. Units are listed largest first.
 * When rounding would print "1000 thousand", the next larger unit is used.
 */
function scale(abs: number, units: Unit[], sep: string): string {
  for (let i = 0; i < units.length; i++) {
    const [size, word] = units[i];
    if (abs < size) continue;
    let v = abs / size;
    let w = word;
    if (Number(v.toFixed(digitsFor(v))) >= 1000 && i > 0) {
      v = abs / units[i - 1][0];
      w = units[i - 1][1];
    }
    return `${trim(v, digitsFor(v))}${sep}${w}`;
  }
  return trim(abs, digitsFor(abs));
}

function isNumber(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

const MISSING = "not published";

/** $1.5T, $248B, $12.3M, $950K, $42 */
export function usdShort(n: number | null | undefined): string {
  if (!isNumber(n)) return MISSING;
  const abs = Math.abs(n);
  if (abs < 1000) return `$${trim(abs, digitsFor(abs))}`;
  return `$${scale(abs, SHORT_UNITS, "")}`;
}

/** $1.5 trillion, $248 billion */
export function usdWords(n: number | null | undefined): string {
  if (!isNumber(n)) return MISSING;
  const abs = Math.abs(n);
  if (abs < 1000) return `$${trim(abs, digitsFor(abs))}`;
  return `$${scale(abs, WORD_UNITS, " ")}`;
}

/** A coin price: enough digits to mean something for both $72,981 and $0.0000046. */
export function price(n: number | null | undefined): string {
  if (!isNumber(n) || n <= 0) return MISSING;
  if (n >= 1000) return `$${Math.round(n).toLocaleString("en-US")}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  // Below a dollar, keep four significant digits without scientific notation.
  const digits = Math.min(12, Math.max(2, 3 - Math.floor(Math.log10(n))));
  return `$${trim(n, digits)}`;
}

/** 19.9 million, 1 billion, 420.7 trillion */
export function tokens(n: number | null | undefined): string {
  if (!isNumber(n)) return MISSING;
  const abs = Math.abs(n);
  if (abs < 1000) return trim(abs, 0);
  return scale(abs, WORD_UNITS, " ");
}

/** 19.9M, 1B */
export function tokensShort(n: number | null | undefined): string {
  if (!isNumber(n)) return MISSING;
  const abs = Math.abs(n);
  if (abs < 1000) return trim(abs, 0);
  return scale(abs, SHORT_UNITS, "");
}

/**
 * A share between 0 and 1 as a percentage. Small values keep a decimal so 0.4%
 * does not print as 0%, and a value just under 100 does not round up to 100.
 */
export function percent(share: number | null | undefined): string {
  if (!isNumber(share)) return "unknown";
  const p = share * 100;
  if (p <= 0) return "0%";
  if (p < 0.1) return "under 0.1%";
  if (p < 10) return `${trim(p, 1)}%`;
  if (p >= 99.5 && p < 100) return "over 99%";
  return `${Math.round(p)}%`;
}

export type FigureParts = {
  /** A small word printed before the number when it is a limit, not an exact value. */
  qualifier: "under" | "over" | null;
  value: string;
};

/**
 * A share split for the large figure on the label: "18", "4.2", or "under" + "0.1".
 * Null when the share is unknown.
 */
export function percentParts(share: number | null | undefined): FigureParts | null {
  if (!isNumber(share)) return null;
  const p = share * 100;
  if (p <= 0) return { qualifier: null, value: "0" };
  if (p < 0.1) return { qualifier: "under", value: "0.1" };
  if (p < 10) return { qualifier: null, value: trim(p, 1) };
  if (p >= 99.5 && p < 100) return { qualifier: "over", value: "99" };
  return { qualifier: null, value: String(Math.round(p)) };
}

/** about 310 days, about 2.4 years */
export function duration(days: number | null | undefined): string {
  if (!isNumber(days)) return "unknown";
  if (days < 1) return "under a day";
  if (days < 1.5) return "about a day";
  if (days < 730) return `about ${Math.round(days)} days`;
  const years = days / 365;
  if (years >= 100) return "over 100 years";
  return `about ${trim(years, years >= 10 ? 0 : 1)} years`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "11 Nov 2026, 03:10 UTC" from an ISO timestamp, without depending on the server's locale. */
export function utcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown time";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/** "Nov 2026" from an ISO date. */
export function monthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
