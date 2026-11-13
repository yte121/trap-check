import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SupplyLabel from "@/components/SupplyLabel";
import { getDataset, getReport, lowestFloat } from "@/lib/data";
import { percent, usdShort } from "@/lib/format";

export default function HomePage() {
  const total = getDataset().coins.length.toLocaleString("en-US");
  const [example] = lowestFloat(100, 1);
  const rows = lowestFloat(300, 10);

  return (
    <>
      <section className="hero">
        <div className="hero__intro">
          <h1 className="hero__title">How much of this coin is actually for sale?</h1>
          <p className="hero__lede">
            Many coins trade with only a small part of their supply on the market. When the rest arrives, the price
            often falls. Type a coin to see how much is trading now and how much is still to come.
          </p>
          <SearchBox />
          <p className="hero__alt">
            Or browse <Link href="/coins">all {total} coins</Link>.
          </p>
        </div>

        {example && (
          <div className="hero__example">
            <p className="hero__example-note">
              From today’s data: the smallest share trading among the 100 largest coins.
            </p>
            <SupplyLabel coin={example.coin} report={getReport(example.coin)} />
            <p className="hero__example-link">
              <Link href={`/coin/${example.coin.slug}`}>Open the full check for {example.coin.name}</Link>
            </p>
          </div>
        )}

        <div className="hero__explain">
          <h2 className="block__title">What the label checks</h2>
          <dl className="explain">
            <div>
              <dt>Trading now</dt>
              <dd>
                The share of a coin’s supply that people can buy and sell today. A small share means most of the
                supply is still held back.
              </dd>
            </div>
            <div>
              <dt>Still to come</dt>
              <dd>
                What the held-back tokens are worth at today’s price, and how many days of normal trading it would
                take the market to absorb them.
              </dd>
            </div>
            <div>
              <dt>Trading depth</dt>
              <dd>
                How much of the coin changes hands in a day compared with its size. Thin trading makes it hard to
                sell without moving the price.
              </dd>
            </div>
          </dl>
          <p className="hero__explain-link">
            <Link href="/method">Read how each check is worked out</Link>
          </p>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="block">
          <h2 className="block__title">Smallest share trading among the 300 largest coins</h2>
          <p className="block__lede">
            These coins have the most supply still to come. That is not a forecast. It is the first thing to check
            before buying any of them.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Coin</th>
                  <th scope="col" className="table__num">
                    Trading now
                  </th>
                  <th scope="col" className="table__num">
                    Still to come
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ coin, share, lockedValue }) => (
                  <tr key={coin.slug}>
                    <th scope="row">
                      <Link href={`/coin/${coin.slug}`}>
                        {coin.name} <span className="table__symbol">{coin.symbol}</span>
                      </Link>
                    </th>
                    <td className="table__num">{percent(share)}</td>
                    <td className="table__num">{usdShort(lockedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
