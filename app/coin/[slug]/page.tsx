import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SearchBox from "@/components/SearchBox";
import SupplyLabel from "@/components/SupplyLabel";
import { isPegged, supplyCap } from "@/lib/checks";
import { summary } from "@/lib/copy";
import { getCoin, getDataset, getReport, neighbours } from "@/lib/data";
import { monthYear, percent, price, tokens, usdShort } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

// Every coin page is built ahead of time. Any other address is a plain 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getDataset().coins.map((coin) => ({ slug: coin.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const coin = getCoin(slug);
  if (!coin) return {};
  const report = getReport(coin);
  const share = report.float.share;
  const title =
    share === null
      ? `${coin.name} (${coin.symbol}) supply check`
      : `${coin.name} (${coin.symbol}) supply check: ${percent(share)} trading`;
  const description = summary(coin, report);
  return {
    title,
    description,
    alternates: { canonical: `/coin/${coin.slug}` },
    openGraph: { title, description, url: `/coin/${coin.slug}` },
  };
}

export default async function CoinPage({ params }: Props) {
  const { slug } = await params;
  const coin = getCoin(slug);
  if (!coin) notFound();

  const report = getReport(coin);
  const { cap, basis } = supplyCap(coin);
  const { previous, next } = neighbours(coin);
  const listed = monthYear(coin.added);
  const fullValue = cap === null ? null : cap * coin.price;

  return (
    <div className="coin">
      <div className="coin__main">
        <SupplyLabel coin={coin} report={report} headingLevel={1} />

        {isPegged(coin) && (
          <p className="note">
            {coin.name} aims to hold a fixed price. These supply checks say little about whether it will keep doing
            so.
          </p>
        )}
      </div>

      <aside className="coin__side">
        <section className="facts">
          <h2 className="facts__title">The numbers behind it</h2>
          <dl className="facts__list">
            <div>
              <dt>Price</dt>
              <dd>{price(coin.price)}</dd>
            </div>
            <div>
              <dt>Market value of tokens trading</dt>
              <dd>{usdShort(coin.mcap)}</dd>
            </div>
            <div>
              <dt>Value if every token traded at this price</dt>
              <dd>{fullValue === null ? "not published" : usdShort(fullValue)}</dd>
            </div>
            <div>
              <dt>Traded in the last 24 hours</dt>
              <dd>{coin.vol > 0 ? usdShort(coin.vol) : "none recorded"}</dd>
            </div>
            <div>
              <dt>Tokens trading</dt>
              <dd>{tokens(coin.circ)}</dd>
            </div>
            <div>
              <dt>Tokens created so far</dt>
              <dd>{tokens(coin.total)}</dd>
            </div>
            <div>
              <dt>Maximum supply</dt>
              <dd>{coin.max === null ? "no cap published" : tokens(coin.max)}</dd>
            </div>
            {listed && (
              <div>
                <dt>Listed since</dt>
                <dd>{listed}</dd>
              </div>
            )}
          </dl>
          {basis === "total" && (
            <p className="facts__note">
              With no maximum published, the checks measure against the tokens created so far.
            </p>
          )}
          <p className="facts__note">
            <Link href="/method">How each check is worked out</Link>
          </p>
        </section>

        <section className="again">
          <h2 className="again__title">Check another coin</h2>
          <SearchBox />
          <ul className="again__links">
            {previous && (
              <li>
                <Link href={`/coin/${previous.slug}`}>
                  No. {previous.rank}: {previous.name}
                </Link>
              </li>
            )}
            {next && (
              <li>
                <Link href={`/coin/${next.slug}`}>
                  No. {next.rank}: {next.name}
                </Link>
              </li>
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}
