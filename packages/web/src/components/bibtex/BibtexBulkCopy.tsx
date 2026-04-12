import { Check, Copy, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useBibtex, type BibtexPaperInput } from "./useBibtex";

type Props = {
  papers: Array<{ doi?: string; title: string }>;
};

export function BibtexBulkCopy({ papers }: Props) {
  const { format, keyFormat, setFormat, setKeyFormat, getBulkBibtex } =
    useBibtex();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [bibtex, setBibtex] = useState("");
  const [errors, setErrors] = useState<
    Array<{ title?: string; doi?: string; message: string }>
  >([]);
  const [copied, setCopied] = useState(false);

  const runBulk = async () => {
    setLoading(true);
    setIsOpen(true);
    setBibtex("");
    setErrors([]);
    try {
      const result = await getBulkBibtex(
        papers as BibtexPaperInput[],
        { format, keyFormat },
        (done, total) => {
          setProgress({ done, total });
        },
      );
      setBibtex(result.bibtex);
      setErrors(result.errors);
    } catch (error) {
      setErrors([
        {
          message:
            error instanceof Error ? error.message : "一括取得に失敗しました",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={papers.length === 0 || loading}
        onClick={runBulk}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Copy size={16} />
        )}
        {loading
          ? `取得中: ${progress.done}/${progress.total || papers.length}`
          : "BibTeX をまとめてコピー"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bibtex-bulk-title"
            className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div>
                <h2
                  id="bibtex-bulk-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Bulk BibTeX Export
                </h2>
                <p className="text-xs text-slate-500">
                  {papers.length} papers selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
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
                      setKeyFormat(
                        e.target.value as "default" | "short" | "venue",
                      )
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
                    onClick={runBulk}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={14}
                      className={loading ? "animate-spin" : ""}
                    />
                    再取得
                  </button>

                  <button
                    type="button"
                    disabled={!bibtex || loading}
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "すべてコピー"}
                  </button>
                </div>
              </div>

              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/60 transition-opacity backdrop-blur-[2px]">
                    <Loader2 size={32} className="animate-spin text-white" />
                    <p className="mt-4 text-sm font-bold text-white">
                      取得中… {progress.done} / {progress.total || papers.length}
                    </p>
                  </div>
                )}
                <div className="overflow-hidden rounded-2xl bg-slate-950 p-1 shadow-inner">
                  <pre className="max-h-[400px] overflow-auto px-5 py-4 font-mono text-xs leading-relaxed text-slate-100 selection:bg-blue-500/30">
                    <code>{bibtex || (loading ? "" : "No entries found.")}</code>
                  </pre>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-red-900">
                    <X size={16} className="rounded-full bg-red-200 p-0.5" />
                    取得失敗 ({errors.length}件)
                  </h3>
                  <div className="mt-2 max-h-32 overflow-auto text-xs text-red-800">
                    <ul className="space-y-1">
                      {errors.map((err, i) => (
                        <li key={i}>
                          <span className="font-bold">
                            {err.title || err.doi || "Unknown"}:
                          </span>{" "}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
