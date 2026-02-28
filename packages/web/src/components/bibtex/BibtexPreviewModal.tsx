"use client";

import { useEffect, useMemo, useState } from "react";
import { useBibtex } from "./useBibtex";

type Props = {
    doi?: string;
    title: string;
    isOpen: boolean;
    onClose: () => void;
};

export function BibtexPreviewModal({ doi, title, isOpen, onClose }: Props) {
    const { format, keyFormat, setFormat, setKeyFormat, getSingleBibtex } = useBibtex();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bibtex, setBibtex] = useState("");
    const [warnings, setWarnings] = useState<string[]>([]);
    const [source, setSource] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getSingleBibtex({ doi, title }, { format, keyFormat });
                if (cancelled) return;
                setBibtex(result.bibtex);
                setWarnings(result.warnings);
                setSource(result.source);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "BibTeX の取得に失敗しました");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [isOpen, doi, title, format, keyFormat, getSingleBibtex]);

    const sourceLabel = useMemo(() => {
        if (!source) return "";
        if (source === "semanticScholar") return "Semantic Scholar fallback";
        return source;
    }, [source]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">BibTeX Preview</h2>
                        <p className="text-xs text-[var(--color-text-muted)]">{title}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-100">
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
                        onClick={async () => {
                            await navigator.clipboard.writeText(bibtex);
                            setCopied(true);
                            window.setTimeout(() => setCopied(false), 2000);
                        }}
                        disabled={!bibtex}
                        className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-60"
                    >
                        {copied ? "✓ Copied" : "Copy"}
                    </button>

                    {sourceLabel && <span className="text-xs text-[var(--color-text-muted)]">source: {sourceLabel}</span>}
                </div>

                <div className="min-h-56 rounded border border-[var(--color-border)] bg-[#0f172a] p-3 text-sm text-slate-100">
                    {loading && <p className="text-xs text-slate-300">Loading...</p>}
                    {error && <p className="text-xs text-red-300">{error}</p>}
                    {!loading && !error && (
                        <pre className="overflow-x-auto text-xs leading-relaxed"><code>{bibtex}</code></pre>
                    )}
                </div>

                {warnings.length > 0 && (
                    <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                        {warnings.map((warning) => (
                            <p key={warning}>- {warning}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
