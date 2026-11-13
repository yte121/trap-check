import type { Report } from "@/lib/checks";
import {
  CAVEAT,
  depthReason,
  depthSentence,
  floatReason,
  floatSentence,
  overhangReason,
  overhangSentence,
  tally,
} from "@/lib/copy";
import { percentParts, usdShort } from "@/lib/format";
import type { Coin } from "@/lib/types";
import FloatBar from "./FloatBar";
import Stamp from "./Stamp";

type Props = {
  coin: Coin;
  report: Report;
  /** The coin name is the page heading on a coin page and a section heading elsewhere. */
  headingLevel?: 1 | 2;
};

/** One coin's supply label: three checks, each with a figure, a stamp and a plain sentence. */
export default function SupplyLabel({ coin, report, headingLevel = 2 }: Props) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const Sub = headingLevel === 1 ? "h2" : "h3";
  const { float, overhang, depth } = report;
  const floatWhy = floatReason(float);
  const overhangWhy = overhangReason(overhang);
  const depthWhy = depthReason(depth);
  const floatFigure = percentParts(float.share);
  const depthFigure = percentParts(depth.turnover);

  return (
    <article className="label">
      <header className="label__head">
        <Heading className="label__title">
          {coin.name} <span className="label__symbol">{coin.symbol}</span>
        </Heading>
        <p className="label__meta">Supply check. Number {coin.rank} by market value.</p>
      </header>

      <section className="check check--first">
        <div className="check__top">
          <Sub className="check__name">Trading now</Sub>
          <Stamp level={float.level} />
        </div>
        <p className="check__figure">
          {floatFigure?.qualifier && <span className="check__qualifier">{floatFigure.qualifier}</span>}
          <span className="check__number">{floatFigure ? floatFigure.value : "?"}</span>
          {floatFigure && <span className="check__unit">%</span>}
          <span className="check__of">of all {coin.symbol}</span>
        </p>
        <FloatBar share={float.share} />
        <p className="check__text">{floatSentence(coin, float)}</p>
        {floatWhy && <p className="check__why">{floatWhy}</p>}
      </section>

      <section className="check">
        <div className="check__top">
          <Sub className="check__name">Still to come</Sub>
          <Stamp level={overhang.level} />
        </div>
        <p className="check__figure">
          <span className="check__number check__number--money">
            {overhang.lockedValue === null ? "?" : usdShort(overhang.lockedValue)}
          </span>
          <span className="check__of">not trading yet</span>
        </p>
        <p className="check__text">{overhangSentence(coin, overhang)}</p>
        {overhangWhy && <p className="check__why">{overhangWhy}</p>}
      </section>

      <section className="check">
        <div className="check__top">
          <Sub className="check__name">Trading depth</Sub>
          <Stamp level={depth.level} />
        </div>
        <p className="check__figure">
          {depthFigure?.qualifier && <span className="check__qualifier">{depthFigure.qualifier}</span>}
          <span className="check__number check__number--money">{depthFigure ? depthFigure.value : "?"}</span>
          {depthFigure && <span className="check__unit">%</span>}
          <span className="check__of">of its value traded in a day</span>
        </p>
        <p className="check__text">{depthSentence(coin, depth)}</p>
        {depthWhy && <p className="check__why">{depthWhy}</p>}
      </section>

      <footer className="label__foot">
        <p className="label__tally">{tally(report)}</p>
        <p className="label__caveat">{CAVEAT}</p>
      </footer>
    </article>
  );
}
