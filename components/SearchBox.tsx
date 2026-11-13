"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** [slug, name, symbol, rank], as served by /search-index.json */
type Entry = [slug: string, name: string, symbol: string, rank: number];

const MAX_RESULTS = 8;

function score(entry: Entry, q: string): number {
  const name = entry[1].toLowerCase();
  const symbol = entry[2].toLowerCase();
  if (symbol === q) return 0;
  if (name === q) return 1;
  if (symbol.startsWith(q)) return 2;
  if (name.startsWith(q)) return 3;
  if (name.split(/\s+/).some((word) => word.startsWith(q))) return 4;
  if (name.includes(q)) return 5;
  if (entry[0].includes(q)) return 6;
  return -1;
}

function match(entries: Entry[] | null, query: string): Entry[] {
  const q = query.trim().toLowerCase();
  if (!entries || !q) return [];
  const scored: Array<[number, Entry]> = [];
  for (const entry of entries) {
    const s = score(entry, q);
    if (s >= 0) scored.push([s, entry]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1][3] - b[1][3]);
  return scored.slice(0, MAX_RESULTS).map(([, entry]) => entry);
}

type LoadState = "idle" | "loading" | "ready" | "failed";

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const started = useRef(false);

  // The coin list is fetched the first time the field is used, not on page load.
  function load() {
    if (started.current) return;
    started.current = true;
    setState("loading");
    fetch("/search-index.json")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Entry[]>;
      })
      .then((rows) => {
        setEntries(rows);
        setState("ready");
      })
      .catch(() => {
        started.current = false;
        setState("failed");
      });
  }

  const results = useMemo(() => match(entries, query), [entries, query]);
  const trimmed = query.trim();
  const showList = open && trimmed.length > 0;
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(`/coin/${entry[0]}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive(results.length ? (activeIndex + 1) % results.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(results.length ? (activeIndex - 1 + results.length) % results.length : 0);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  let status: string | null = null;
  if (showList) {
    if (state === "loading") status = "Loading the coin list…";
    else if (state === "failed") status = "The coin list did not load. Check your connection, then type again.";
    else if (state === "ready" && results.length === 0)
      status = `No coin matches “${trimmed}”. Trap Check covers the 1,000 largest coins.`;
  }

  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(results[activeIndex]);
      }}
    >
      <label className="search__label" htmlFor={inputId}>
        Coin name or symbol
      </label>
      <div className="search__row">
        <input
          id={inputId}
          className="search__input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="For example: solana, or SOL"
          role="combobox"
          aria-expanded={showList && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results.length > 0 ? `${listId}-${activeIndex}` : undefined}
          value={query}
          onFocus={() => {
            load();
            setOpen(true);
          }}
          onChange={(event) => {
            load();
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
        <button className="search__button" type="submit">
          Check coin
        </button>
      </div>

      <ul id={listId} className="search__list" role="listbox" aria-label="Matching coins" hidden={!showList || results.length === 0}>
        {results.map((entry, index) => (
          <li
            key={entry[0]}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={index === activeIndex ? "search__option search__option--active" : "search__option"}
            // onMouseDown fires before the input loses focus, so the click is not lost.
            onMouseDown={(event) => {
              event.preventDefault();
              go(entry);
            }}
            onMouseEnter={() => setActive(index)}
          >
            <span className="search__option-name">{entry[1]}</span>
            <span className="search__option-symbol">{entry[2]}</span>
            <span className="search__option-rank">No. {entry[3]}</span>
          </li>
        ))}
      </ul>

      <p className="search__status" role="status">
        {status}
      </p>
    </form>
  );
}
