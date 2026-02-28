"use client";

import { useState } from "react";
import { useBibtex, type BibtexPaperInput } from "./useBibtex";

type Props = {
    papers: Array<{ doi?: string; title: string }>;
};

export function BibtexBulkCopy({ papers }: Props) {
    const { format, keyFormat, setFormat, setKeyFormat, getBulkBibtex } = useBibtex();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [bibtex, setBibtex] = useState("");
    const [errors, setErrors] = useState<Array<{ title?: string; doi?: string; message: string }>>([]);
    const [copied, setCopied] = useState(false);

    const runBulk = async () => {
        setLoading(true);
        setIsOpen(true);
        setBibtex("");
        setErrors([]);
        try {
            const result = await getBulkBibtex(papers as BibtexPaperInput[], { format, keyFormat }, (done, total) => {
                setProgress({ done, total });
            });
            setBibtex(result.bibtex);
            setErrors(result.errors);
        } catch (error) {
            setErrors([{ message: error instanceof Error ? error.message : "一括取得に失敗しました" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                disabled={papers.length === 0 || loading}
                onClick={runBulk}
                className="rounded bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            >
                {loading ? `取得中: ${progress.done}/${progress.total || papers.length}` : "BibTeX をまとめてコピー"}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-4xl rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Bulk BibTeX</h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded border border-[var(--color-border)] p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setFormat("bibtex")}
                                    className={`rounded px-2 py-1 ${format === "bibtex" ? "bg-[var(--color-primary)] text-white" : "hover:bg-gray-100"}`}
                                >
                                    BibTeX
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormat("biblatex")}
                                    className={`rounded px-2 py-1 ${format === "biblatex" ? "bg-[var(--color-primary)] text-white" : "hover:bg-gray-100"}`}
                                >
                                    BibLaTeX
                                </button>
                            </div>

                            <label className="text-xs text-[var(--color-text-muted)]">
                                Key:
                                <select
                                    value={keyFormat}
                                    onChange={(e) => setKeyFormat(e.target.value as "default" | "short" | "venue")}
                                    className="ml-1 rounded border border-[var(--color-border)] bg-white px-2 py-1 text-xs"
                                >
                                    <option value="default">default</option>
                                    <option value="short">short</option>
                                    <option value="venue">venue</option>
                                </select>
                            </label>

                            <button
                                type="button"
                                onClick={runBulk}
                                disabled={loading}
                                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-60"
                            >
                                再取得
                            </button>

                            <button
                                type="button"
                                disabled={!bibtex}
                                onClick={async () => {
                                    await navigator.clipboard.writeText(bibtex);
                                    setCopied(true);
                                    window.setTimeout(() => setCopied(false), 2000);
                                }}
                                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-60"
                            >
                                {copied ? "✓ Copied" : "コピー"}
                            </button>
                        </div>

                        {loading && (
                            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                                取得中: {progress.done}/{progress.total || papers.length}
                            </p>
                        )}

                        <pre className="max-h-72 overflow-auto rounded border border-[var(--color-border)] bg-[#0f172a] p-3 text-xs text-slate-100">
                            <code>{bibtex || (loading ? "Loading..." : "No output")}</code>
                        </pre>

                        {errors.length > 0 && (
                            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                <p className="font-medium">取得失敗 ({errors.length})</p>
                                <ul className="mt-1 space-y-1">
                                    {errors.map((err, i) => (
                                        <li key={`${err.title ?? err.doi ?? "error"}-${i}`}>
                                            {(err.title || err.doi || "unknown")} - {err.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
