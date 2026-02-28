"use client";

import { useState } from "react";
import Link from "next/link";

interface AuthorCandidate {
  authorId?: string;
  name: string;
  affiliations: string[];
  paperCount: number;
  citationCount: number;
  hIndex: number;
}

export default function AuthorsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AuthorCandidate[]>([]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/authors/search?q=${encodeURIComponent(query)}&limit=15`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Author search failed");
      }
      setCandidates(data.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Author Profiler</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          著者名または Semantic Scholar Author ID
          から研究プロフィールを確認します。
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: Geoffrey Hinton / 1741105"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-slate-50 text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Affiliations</th>
                <th className="px-4 py-3">h-index</th>
                <th className="px-4 py-3">Papers</th>
                <th className="px-4 py-3">Citations</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  key={`${candidate.authorId ?? candidate.name}`}
                  className="border-b border-[var(--color-border)]"
                >
                  <td className="px-4 py-3 font-medium">{candidate.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {candidate.affiliations.join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">{candidate.hIndex}</td>
                  <td className="px-4 py-3">{candidate.paperCount}</td>
                  <td className="px-4 py-3">{candidate.citationCount}</td>
                  <td className="px-4 py-3">
                    {candidate.authorId ? (
                      <Link
                        href={`/authors/${encodeURIComponent(candidate.authorId)}`}
                        className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        View Profile
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        N/A
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
