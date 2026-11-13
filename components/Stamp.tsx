import type { Level } from "@/lib/checks";
import { STAMP_WORDS } from "@/lib/copy";

/** The inspection stamp beside each check. The word carries the meaning; colour only repeats it. */
export default function Stamp({ level }: { level: Level }) {
  return <span className={`stamp stamp--${level}`}>{STAMP_WORDS[level]}</span>;
}
