import Link from "next/link";
import SearchBox from "@/components/SearchBox";

export default function NotFound() {
  return (
    <div className="prose-page">
      <h1 className="page-title">That page is not here</h1>
      <p className="page-lede">
        The address may be mistyped, or the coin may be outside the 1,000 largest that Trap Check covers. Search
        for a coin, or browse <Link href="/coins">the full list</Link>.
      </p>
      <SearchBox />
    </div>
  );
}
