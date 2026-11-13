/** One coin, as stored in data/coins.json. All money values are US dollars. */
export type Coin = {
  /** URL-safe id from the data provider, unique within the dataset. */
  slug: string;
  name: string;
  symbol: string;
  /** Rank by market value, 1 = largest. */
  rank: number;
  price: number;
  /** Market value of the tokens that are trading. */
  mcap: number;
  /** Trading volume over the last 24 hours. */
  vol: number;
  /** Tokens trading today. */
  circ: number;
  /** Tokens created so far, minus any burned. Null when not published. */
  total: number | null;
  /** The most tokens that can ever exist. Null when there is no published cap. */
  max: number | null;
  /** ISO date the provider first listed the coin, when the provider gives one. */
  added?: string | null;
};

export type DataSource = "coingecko" | "coinmarketcap" | "fixture";

export type Dataset = {
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
  source: DataSource;
  coins: Coin[];
};
