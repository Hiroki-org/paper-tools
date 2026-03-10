"use client";

import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";

interface SearchFormProps {
  onSearch: (query: string, maxResults: number) => void;
  loading?: boolean;
  placeholder?: string;
}

const fieldClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10";

export default function SearchForm({
  onSearch,
  loading = false,
  placeholder = "例: program repair / software testing / graph neural networks",
}: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), maxResults);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm backdrop-blur"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
        <div className="space-y-1.5">
          <label htmlFor="search-query" className="block text-sm font-semibold">
            Keyword
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className={fieldClassName}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            タイトル、研究トピック、手法名などで検索できます。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="max-results" className="block text-sm font-semibold">
            Max Results
          </label>
          <input
            id="max-results"
            type="number"
            min={1}
            max={100}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            disabled={loading}
            className={fieldClassName}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SearchIcon size={16} />
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
