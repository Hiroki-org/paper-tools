"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Database,
  ExternalLink,
  FileText,
  RefreshCw,
  Rows3,
  Sparkles,
} from "lucide-react";
import { BibtexButton } from "@/components/bibtex/BibtexButton";
import { BibtexBulkCopy } from "@/components/bibtex/BibtexBulkCopy";
import { BibtexPreviewModal } from "@/components/bibtex/BibtexPreviewModal";
import { preCachePaper } from "@/components/paper/usePaperDetail";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewTarget, setPreviewTarget] = useState<NotionRecord | null>(null);

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

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load archive");
      }

      setRecords(data.records ?? []);
      setDatabaseMeta((data.database as NotionDatabaseMeta) ?? null);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const allSelected = records.length > 0 && selectedIds.size === records.length;

  const selectedPapers = records
    .filter((record) => selectedIds.has(record.pageId))
    .map((record) => ({ doi: record.doi, title: record.title }));

  const recordsWithDoi = records.filter((record) => Boolean(record.doi)).length;
  const recordsWithS2 = records.filter((record) =>
    Boolean(record.semanticScholarId),
  ).length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    const newSelectedIds = new Set<string>();
    for (const record of records) {
      newSelectedIds.add(record.pageId);
    }
    setSelectedIds(newSelectedIds);
  };

  const toggleRow = (pageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-6 shadow-sm backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <Sparkles size={12} />
              Notion archive
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Saved Papers
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--color-text-muted)]">
                保存済みの論文を一覧で確認し、BibTeX の生成、Notion
                ページの確認、 グラフ可視化への導線をまとめて扱えます。
              </p>
            </div>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Records
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
              {records.length}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              アーカイブ済み論文の総数
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              DOI coverage
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
              {recordsWithDoi}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              DOI 付きの論文
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              S2 linked
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
              {recordsWithS2}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Semantic Scholar ID 付き
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Selected
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
              {selectedIds.size}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              一括 BibTeX 対象
            </p>
          </div>
        </div>
      </section>

      {databaseMeta && (
        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Database size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Workspace
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">
              {databaseMeta.workspaceName}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Rows3 size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Database
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">
              {databaseMeta.databaseName}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <FileText size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Database ID
              </span>
            </div>
            <p className="mt-3 break-all text-sm text-[var(--color-text)]">
              {databaseMeta.databaseId}
            </p>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-700">
            No papers archived yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Recommend や Search から論文を保存すると、ここに一覧表示されます。
          </p>
        </div>
      )}

      {records.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Archive table
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                タイトルから詳細ページへ移動できます。必要に応じて Graph や
                Notion ページも開けます。
              </p>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Showing {records.length} records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white">
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  <th className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all papers"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-semibold">#</th>
                  <th className="px-4 py-3.5 font-semibold">Title</th>
                  <th className="px-4 py-3.5 font-semibold">DOI</th>
                  <th className="px-4 py-3.5 font-semibold">S2 ID</th>
                  <th className="px-4 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border)]">
                {records.map((record, index) => (
                  <tr
                    key={record.pageId}
                    className="align-top transition-colors hover:bg-slate-50/80"
                  >
                    <td
                      className="px-4 py-4"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.pageId)}
                        onChange={() => toggleRow(record.pageId)}
                        aria-label={`Select ${record.title}`}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                    </td>

                    <td className="px-4 py-4 text-xs font-medium text-slate-400">
                      {index + 1}
                    </td>

                    <td className="max-w-xl px-4 py-4">
                      {record.semanticScholarId || record.doi ? (
                        <div className="flex items-start gap-2">
                          <Link
                            href={`/paper/${encodeURIComponent((record.semanticScholarId || record.doi)!)}`}
                            onClick={() => {
                              preCachePaper({
                                paperId: (record.semanticScholarId ||
                                  record.doi)!,
                                title: record.title,
                                externalIds: record.doi
                                  ? { DOI: record.doi }
                                  : {},
                              });
                            }}
                            className="line-clamp-2 font-semibold leading-6 text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
                          >
                            {record.title}
                          </Link>

                          {record.semanticScholarId ? (
                            <a
                              href={`https://www.semanticscholar.org/paper/${encodeURIComponent(record.semanticScholarId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open in Semantic Scholar"
                              title="Open in Semantic Scholar"
                              className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-primary)]"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : record.doi ? (
                            <a
                              href={`https://doi.org/${record.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open in DOI"
                              title="Open in DOI"
                              className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-primary)]"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <span className="line-clamp-2 font-semibold text-[var(--color-text)]">
                          {record.title}
                        </span>
                      )}
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      {record.doi ? (
                        <a
                          href={`https://doi.org/${record.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[var(--color-primary)] hover:underline"
                        >
                          {record.doi}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {record.semanticScholarId ? (
                        <a
                          href={`https://www.semanticscholar.org/paper/${encodeURIComponent(record.semanticScholarId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          {record.semanticScholarId.slice(0, 12)}…
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div
                        className="flex flex-wrap gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <BibtexButton doi={record.doi} title={record.title} />

                        <button
                          type="button"
                          onClick={() => setPreviewTarget(record)}
                          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-slate-50"
                        >
                          Preview
                        </button>

                        {record.doi && (
                          <a
                            href={`/graph?doi=${encodeURIComponent(record.doi)}`}
                            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-slate-50"
                          >
                            Graph
                          </a>
                        )}

                        <a
                          href={`https://www.notion.so/${record.pageId.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-slate-50"
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
        </section>
      )}

      {previewTarget && (
        <BibtexPreviewModal
          doi={previewTarget.doi}
          title={previewTarget.title}
          isOpen={Boolean(previewTarget)}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(96vw,820px)] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {selectedIds.size} 件を選択中
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              選択した論文の BibTeX をまとめて取得できます。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-slate-50"
            >
              選択解除
            </button>
            <BibtexBulkCopy papers={selectedPapers} />
          </div>
        </div>
      )}
    </div>
  );
}
