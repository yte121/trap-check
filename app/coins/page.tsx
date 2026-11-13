import type { Metadata } from "next";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import { getDataset, getReport } from "@/lib/data";
import { percent } from "@/lib/format";

export const metadata: Metadata = {
  title: "All coins",
  description: "The 1,000 largest coins by market value, each with the share of its supply that is trading today.",
  alternates: { canonical: "/coins" },
};

export default function CoinsPage() {
  const { coins } = getDataset();

  return (
    <div className="prose-page prose-page--wide">
      <h1 className="page-title">All {coins.length.toLocaleString("en-US")} coins</h1>
      <p className="page-lede">
        Listed from the largest by market value. The figure beside each coin is the share of its supply that is
        trading today.
      </p>
      <SearchBox />

      <ol className="coin-list">
        {coins.map((coin) => {
          const share = getReport(coin).float.share;
          return (
            <li key={coin.slug}>
              <Link href={`/coin/${coin.slug}`} prefetch={false}>
                <span className="coin-list__name">{coin.name}</span>{" "}
                <span className="coin-list__symbol">{coin.symbol}</span>
              </Link>
              <span className="coin-list__share">{share === null ? "supply not published" : percent(share)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
