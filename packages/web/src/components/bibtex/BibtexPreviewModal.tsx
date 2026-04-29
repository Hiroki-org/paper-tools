import { Check, Copy, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBibtex } from "./useBibtex";

type Props = {
  doi?: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
};

function useBibtexPreviewFetch(
  isOpen: boolean,
  doi: string | undefined,
  title: string,
  format: "bibtex" | "biblatex",
  keyFormat: "default" | "short" | "venue",
  getSingleBibtex: (
    input: { doi?: string; title?: string },
    overrides?: { format?: "bibtex" | "biblatex"; keyFormat?: "default" | "short" | "venue"; force?: boolean }
  ) => Promise<{ bibtex: string; source: string; warnings: string[] }>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibtex, setBibtex] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getSingleBibtex(
          { doi, title },
          { format, keyFormat },
        );
        if (cancelled) return;
        setBibtex(result.bibtex);
        setWarnings(result.warnings);
        setSource(result.source);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "BibTeX の取得に失敗しました",
        );
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

  return { loading, error, bibtex, warnings, source };
}

export function BibtexPreviewModal({ doi, title, isOpen, onClose }: Props) {
  const { format, keyFormat, setFormat, setKeyFormat, getSingleBibtex } =
    useBibtex();

  const { loading, error, bibtex, warnings, source } = useBibtexPreviewFetch(
    isOpen,
    doi,
    title,
    format,
    keyFormat,
    getSingleBibtex
  );

  const [copied, setCopied] = useState(false);

  const sourceLabel = useMemo(() => {
    if (!source) return "";
    if (source === "semanticScholar") return "Semantic Scholar fallback";
    return source;
  }, [source]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bibtex-preview-title"
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="max-w-[85%]">
            <h2
              id="bibtex-preview-title"
              className="text-lg font-bold text-slate-900"
            >
              BibTeX Preview
            </h2>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Format
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setFormat("bibtex")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    format === "bibtex"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  BibTeX
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("biblatex")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    format === "biblatex"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  BibLaTeX
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Citation Key
              </span>
              <select
                value={keyFormat}
                onChange={(e) =>
                  setKeyFormat(e.target.value as "default" | "short" | "venue")
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="default">Default</option>
                <option value="short">Short</option>
                <option value="venue">Venue based</option>
              </select>
            </div>

            <div className="ml-auto flex items-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bibtex);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    console.error("Clipboard copy failed:", err);
                  }
                }}
                disabled={!bibtex || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-slate-300"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          </div>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 transition-opacity backdrop-blur-[2px]">
                <Loader2 size={32} className="animate-spin text-white" />
              </div>
            )}
            <div className="overflow-hidden rounded-2xl bg-slate-950 p-1 shadow-inner">
              <div className="max-h-[300px] overflow-auto px-5 py-4">
                {error ? (
                  <p className="font-mono text-xs text-red-400">{error}</p>
                ) : (
                  <pre className="font-mono text-xs leading-relaxed text-slate-100 selection:bg-blue-500/30">
                    <code>{bibtex || (loading ? "" : "No content")}</code>
                  </pre>
                )}
              </div>
            </div>
            {sourceLabel && (
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Source: {sourceLabel}
                </span>
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                ⚠️ Warnings
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
