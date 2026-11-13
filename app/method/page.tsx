import type { Metadata } from "next";
import Link from "next/link";
import { THRESHOLDS } from "@/lib/checks";
import { getDataset } from "@/lib/data";
import { percent, usdShort } from "@/lib/format";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Trap Check works out the share of a coin that is trading, the value still to come and how easily it trades, and what a flag does and does not mean.",
  alternates: { canonical: "/method" },
};

export default function MethodPage() {
  const { source, coins } = getDataset();
  const provider = SOURCES[source];

  return (
    <div className="prose-page">
      <h1 className="page-title">How Trap Check works</h1>
      <p className="page-lede">
        Every coin gets the same three checks. They use four public numbers: the price, the tokens trading today,
        the total supply and the last 24 hours of trading.
      </p>

      <h2>Trading now</h2>
      <p>
        Tokens trading today, divided by the most tokens that can ever exist. When a coin publishes no maximum, the
        tokens created so far are used instead, and the label says so.
      </p>
      <ul>
        <li>
          <strong>Flag</strong> when less than {percent(THRESHOLDS.floatFlag)} is trading.
        </li>
        <li>
          <strong>Watch</strong> when less than {percent(THRESHOLDS.floatWatch)} is trading, or when the supply is
          not published.
        </li>
      </ul>
      <p>
        Why it matters: tokens that are not trading yet usually belong to the team, early investors or a reward
        pool. As they are released, there is more to sell. A study of token launches by the trading firm GSR found
        that launches with under 20% of supply trading lost roughly 75% over the following year, against about 45%
        for launches with 30% to 50% trading (
        <a
          href="https://www.gsr.io/insights/beyond-low-float-high-fdv-what-better-token-launches-look-like"
          rel="noopener"
        >
          GSR
        </a>
        ).
      </p>

      <h2>Still to come</h2>
      <p>
        The tokens not yet trading, valued at today’s price. That value is then divided by one day of trading to
        show how many days of normal trading the market would need to absorb it.
      </p>
      <ul>
        <li>
          <strong>Flag</strong> above {THRESHOLDS.overhangFlagDays} days, or when tokens are waiting and no trading
          is recorded.
        </li>
        <li>
          <strong>Watch</strong> above {THRESHOLDS.overhangWatchDays} days.
        </li>
      </ul>
      <p>
        These limits are Trap Check’s own rule of thumb, not an industry standard. The check also does not know
        when the tokens will be released: it could be next month or spread over ten years. Look up the coin’s
        release schedule before relying on it.
      </p>

      <h2>Trading depth</h2>
      <p>
        The value traded in the last 24 hours, divided by the market value of the tokens trading. It shows how
        easily the coin changes hands for its size.
      </p>
      <ul>
        <li>
          <strong>Flag</strong> when less than {usdShort(THRESHOLDS.volumeFlag)} traded in a day, or less than{" "}
          {percent(THRESHOLDS.turnoverFlag)} of the coin’s market value.
        </li>
        <li>
          <strong>Watch</strong> when less than {usdShort(THRESHOLDS.volumeWatch)} traded, or less than{" "}
          {percent(THRESHOLDS.turnoverWatch)} of its market value.
        </li>
        <li>
          <strong>Watch</strong> when more than the coin’s whole market value traded in one day. That can be a rush
          of attention or trading staged to look busy.
        </li>
      </ul>
      <p>These limits are also Trap Check’s own rule of thumb.</p>

      <h2>What a flag means</h2>
      <p>
        A flag is a reason to look closer before buying. It is not a prediction that the price will fall, and it is
        not advice to sell.
      </p>
      <p>
        No flag does not mean safe. The checks look only at supply and trading. They say nothing about the project,
        the people behind it, its code, or whether an exchange might remove it.
      </p>

      <h2>Where the numbers come from</h2>
      <p>
        Prices, supply and trading volume for the {coins.length.toLocaleString("en-US")} largest coins come from{" "}
        {provider.url ? (
          <a href={provider.url} rel="noopener">
            {provider.name}
          </a>
        ) : (
          provider.name
        )}
        . They are refreshed about once a day, and the time of the last update is at the foot of every page.
      </p>

      <h2>Limits to keep in mind</h2>
      <ul>
        <li>Supply figures are reported by the projects themselves and can be wrong or out of date.</li>
        <li>Coins outside the {coins.length.toLocaleString("en-US")} largest are not covered.</li>
        <li>Coins that aim to hold a fixed price, such as dollar coins, are not what these checks were built for.</li>
        <li>Release dates for locked tokens are not checked.</li>
      </ul>

      <p>
        <Link href="/">Check a coin</Link>
      </p>
    </div>
  );
}
