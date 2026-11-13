# Trap Check

Plain-word supply checks for the 1,000 largest crypto coins: how much of a coin is trading today, how much is still to come, and how easily it trades.

- Free to use, no ads, no sign-up. Not financial advice.
- Every page is built ahead of time from `data/coins.json`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run data` | Fetch fresh coin data into `data/coins.json` |
| `npm run build` | Refresh data if older than 20 hours, then build the site |
| `npm test` | Run the unit tests |
| `TRAPCHECK_FIXTURE=1 npm run build` | Build with made-up test coins (refused on Vercel) |

## Data

CoinMarketCap is used when `CMC_API_KEY` is set; otherwise CoinGecko's public API (`COINGECKO_API_KEY` optional). A fetch that fails validation never replaces good data.

## Tips

The tip page shows a public Solana address. No private key or seed phrase is stored anywhere in this project.
