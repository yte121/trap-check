import type { Metadata } from "next";
import QRCode from "qrcode";
import CopyButton from "@/components/CopyButton";
import { SITE_NAME, TIP_ADDRESS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Leave a tip",
  description: `${SITE_NAME} is free and has no ads. Tips in USDC or SOL on Solana help keep it running.`,
  alternates: { canonical: "/tip" },
};

export default async function TipPage() {
  // The code holds the address and nothing else, so any wallet app can read it.
  const qr = await QRCode.toString(TIP_ADDRESS, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  const head = TIP_ADDRESS.slice(0, 4);
  const tail = TIP_ADDRESS.slice(-4);

  return (
    <div className="prose-page">
      <h1 className="page-title">Leave a tip</h1>
      <p className="page-lede">
        {SITE_NAME} is free and has no ads. If it saved you from a bad buy, a tip helps keep it running.
      </p>

      <section className="tip">
        <h2 className="tip__title">Send USDC or SOL on the Solana network</h2>
        <p className="tip__address" aria-label="Solana address for tips">
          {TIP_ADDRESS}
        </p>
        <CopyButton value={TIP_ADDRESS} label="Copy address" />
        <div
          className="tip__qr"
          role="img"
          aria-label="QR code of the tip address"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </section>

      <h2>Before you send</h2>
      <ul>
        <li>Use the Solana network only. Coins sent on another network will not arrive.</li>
        <li>
          After pasting, compare the first and last four characters: <strong>{head}</strong> and{" "}
          <strong>{tail}</strong>.
        </li>
        <li>A tip is a gift. It buys nothing, and it cannot be refunded.</li>
      </ul>

      <h2>What {SITE_NAME} will never ask for</h2>
      <p>
        {SITE_NAME} will never ask you to connect a wallet, sign a transaction or share a seed phrase. Anyone asking
        for those in its name is running a scam.
      </p>
    </div>
  );
}
