"use client";

import { useRef, useState } from "react";

/** Copies a value to the clipboard and says so, in the button itself and to screen readers. */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button type="button" className="button" onClick={copy}>
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed. Select the address instead." : label}
      </span>
    </button>
  );
}
