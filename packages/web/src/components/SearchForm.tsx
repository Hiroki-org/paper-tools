"use client";

import { useState } from "react";

interface SearchFormProps {
  onSearch: (query: string, maxResults: number) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function SearchForm({
  onSearch,
  loading = false,
  placeholder = "Enter keyword…",
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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <label htmlFor="search-query" className="mb-1 block text-sm font-medium">
          Keyword
        </label>
        <input
          id="search-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      <div className="w-28">
        <label htmlFor="max-results" className="mb-1 block text-sm font-medium">
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
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
