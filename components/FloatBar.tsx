import { percent } from "@/lib/format";

/**
 * The bar at the heart of the label: solid for tokens trading now, hatched for
 * tokens still to come.
 */
export default function FloatBar({ share }: { share: number | null }) {
  if (share === null) {
    return (
      <div className="bar bar--unknown" role="img" aria-label="Share trading is unknown">
        <span className="bar__unknown">Supply not published</span>
      </div>
    );
  }
  const trading = Math.max(0, Math.min(1, share));
  // A sliver stays visible at very small shares so the bar never looks empty.
  const width = trading === 0 ? 0 : Math.max(1.5, trading * 100);
  return (
    <div>
      <div
        className="bar"
        role="img"
        aria-label={`${percent(trading)} trading now, ${percent(1 - trading)} still to come`}
      >
        <div className="bar__fill" style={{ width: `${width}%` }} />
      </div>
      <div className="bar__key" aria-hidden="true">
        <span className="bar__key-item">
          <span className="bar__swatch bar__swatch--solid" />
          Trading now
        </span>
        <span className="bar__key-item">
          <span className="bar__swatch bar__swatch--hatch" />
          Still to come
        </span>
      </div>
    </div>
  );
}
