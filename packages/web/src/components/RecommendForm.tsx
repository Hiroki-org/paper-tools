"use client";

import { Lightbulb, Network } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "single" | "multi";

interface RecommendFormProps {
  onRecommend: (params: {
    mode: Mode;
    paperId?: string;
    positiveIds?: string[];
    negativeIds?: string[];
    limit: number;
    from?: "recent" | "all-cs";
  }) => void;
  loading?: boolean;
  initialPaperId?: string;
}

const fieldClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10";

export default function RecommendForm({
  onRecommend,
  loading = false,
  initialPaperId = "",
}: RecommendFormProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [paperId, setPaperId] = useState("");
  const [positiveIds, setPositiveIds] = useState("");
  const [negativeIds, setNegativeIds] = useState("");
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState<"recent" | "all-cs">("recent");

  useEffect(() => {
    if (!initialPaperId.trim()) return;
    setMode("single");
    setPaperId(initialPaperId.trim());
  }, [initialPaperId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "single") {
      if (!paperId.trim()) return;
      onRecommend({ mode, paperId: paperId.trim(), limit, from });
      return;
    }

    const pos = positiveIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (pos.length === 0) return;

    const neg = negativeIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    onRecommend({
      mode,
      positiveIds: pos,
      negativeIds: neg.length > 0 ? neg : undefined,
      limit,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Recommendation input
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
            推薦の基準を指定
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            単一の論文を起点にするか、複数論文の傾向から候補を集めるかを選べます。
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "single"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lightbulb size={15} />
            Single Paper
          </button>
          <button
            type="button"
            onClick={() => setMode("multi")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "multi"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Network size={15} />
            Multiple Papers
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <div className="space-y-1.5">
          <label htmlFor="paper-id" className="block text-sm font-semibold">
            Paper ID
          </label>
          <input
            id="paper-id"
            type="text"
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            placeholder="10.1145/3292500.3330672"
            disabled={loading}
            className={fieldClassName}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            DOI、Semantic Scholar Paper ID、ArXiv ID などを入力できます。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="positive-ids"
              className="block text-sm font-semibold"
            >
              Positive Paper IDs
            </label>
            <textarea
              id="positive-ids"
              rows={5}
              value={positiveIds}
              onChange={(e) => setPositiveIds(e.target.value)}
              placeholder={
                "10.1145/3292500.3330672\n10.1038/s41586-021-03819-2"
              }
              disabled={loading}
              className={fieldClassName}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              関連性を高めたい論文を改行またはカンマ区切りで指定します。
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="negative-ids"
              className="block text-sm font-semibold"
            >
              Negative Paper IDs
            </label>
            <textarea
              id="negative-ids"
              rows={5}
              value={negativeIds}
              onChange={(e) => setNegativeIds(e.target.value)}
              placeholder="除外したい論文 ID を入力"
              disabled={loading}
              className={fieldClassName}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              不要な方向性や近すぎる論文を外したい場合に使います。
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 border-t border-slate-200/80 pt-4 sm:grid-cols-[7rem_10rem_minmax(0,1fr)] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="rec-limit" className="block text-sm font-semibold">
            Limit
          </label>
          <input
            id="rec-limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={loading}
            className={fieldClassName}
          />
        </div>

        {mode === "single" ? (
          <div className="space-y-1.5">
            <label htmlFor="rec-from" className="block text-sm font-semibold">
              Candidate Pool
            </label>
            <select
              id="rec-from"
              value={from}
              onChange={(e) => setFrom(e.target.value as "recent" | "all-cs")}
              disabled={loading}
              className={fieldClassName}
            >
              <option value="recent">Recent</option>
              <option value="all-cs">All CS</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-transparent">
              Candidate Pool
            </span>
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-slate-50 px-3.5 py-2.5 text-sm text-[var(--color-text-muted)]">
              Multi-paper mode では pool は自動選択されます。
            </div>
          </div>
        )}

        <div className="flex justify-start sm:justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-[46px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Loading…" : "Get Recommendations"}
          </button>
        </div>
      </div>
    </form>
  );
}
