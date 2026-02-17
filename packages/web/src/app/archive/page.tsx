"use client";

import { useState, useEffect, useCallback } from "react";

interface NotionRecord {
  pageId: string;
  title: string;
  doi?: string;
  semanticScholarId?: string;
}

interface NotionDatabaseMeta {
  databaseId: string;
  databaseName: string;
  workspaceName: string;
}

export default function ArchivePage() {
  const [records, setRecords] = useState<NotionRecord[]>([]);
  const [databaseMeta, setDatabaseMeta] = useState<NotionDatabaseMeta | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/archive");
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load archive");
      setRecords(data.records ?? []);
      setDatabaseMeta((data.database as NotionDatabaseMeta) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notion Archive</h1>
        <button
          onClick={fetchRecords}
          disabled={loading}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {databaseMeta && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm">
          <p className="text-[var(--color-text)]">
            <span className="font-medium">Workspace:</span>{" "}
            {databaseMeta.workspaceName}
          </p>
          <p className="text-[var(--color-text)]">
            <span className="font-medium">Database:</span>{" "}
            {databaseMeta.databaseName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            ID: {databaseMeta.databaseId}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400">
          No papers archived yet. Use the Recommend page to save papers to
          Notion.
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">DOI</th>
                <th className="px-4 py-3 font-medium">S2 ID</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={r.pageId}
                  className="border-b border-[var(--color-border)] transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-medium">
                    {r.title}
                  </td>
                  <td className="px-4 py-3">
                    {r.doi ? (
                      <a
                        href={`https://doi.org/${r.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {r.doi}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.semanticScholarId ? (
                      <a
                        href={`https://api.semanticscholar.org/graph/v1/paper/${r.semanticScholarId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {r.semanticScholarId.slice(0, 12)}…
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.doi && (
                        <a
                          href={`/graph?doi=${encodeURIComponent(r.doi)}`}
                          className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs transition-colors hover:bg-gray-100"
                        >
                          Graph
                        </a>
                      )}
                      <a
                        href={`https://www.notion.so/${r.pageId.replace(/-/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs transition-colors hover:bg-gray-100"
                      >
                        Notion ↗
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Showing {records.length} records from Notion database
      </p>
    </div>
  );
}
