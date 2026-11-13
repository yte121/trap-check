import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/big-shoulders";
import "./globals.css";
import { getDataset } from "@/lib/data";
import { utcStamp } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE, SOURCES, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME}: how much of a coin is actually trading?`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Type a coin and see, in plain words, how much of its supply is trading today, how much is still to come, and how easily it trades. Free, no sign-up.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME}: how much of a coin is actually trading?`,
    description: SITE_TAGLINE,
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#D9E0E6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { fetchedAt, source } = getDataset();
  const provider = SOURCES[source];

  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-head">
          <Link className="wordmark" href="/">
            <span className="wordmark__mark" aria-hidden="true" />
            {SITE_NAME}
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/coins">All coins</Link>
            <Link href="/method">How it works</Link>
            <Link href="/tip">Tip</Link>
          </nav>
        </header>

        <main id="main" className="page">
          {children}
        </main>

        <footer className="site-foot">
          <p>
            {SITE_NAME} shows public market data in plain words. It is not financial advice and it never tells you
            to buy or sell. Data can be late or wrong, so check anything that matters to you.
          </p>
          <p>
            Data from{" "}
            {provider.url ? (
              <a href={provider.url} rel="noopener">
                {provider.name}
              </a>
            ) : (
              provider.name
            )}
            , last updated {utcStamp(fetchedAt)}.
          </p>
          <p>
            Free to use, with no ads. If it helped, you can <Link href="/tip">leave a tip</Link>.
          </p>
        </footer>
      </body>
    </html>
  );
}
