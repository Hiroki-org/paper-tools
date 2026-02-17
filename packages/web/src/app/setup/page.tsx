"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle } from "lucide-react";

type DatabaseItem = {
  id: string;
  title: string;
  icon: string | null;
  description: string;
};

export default function SetupPage() {
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/databases", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error ?? "データベース取得に失敗しました");
        if (!cancelled) setItems(data.databases ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectDatabase = async (databaseId: string) => {
    setSelectingId(databaseId);
    setWarnings([]);
    setError(null);
    setShowWarnings(false);
    try {
      const res = await fetch("/api/databases/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "DB選択に失敗しました");
      
      const newWarnings = data.warnings ?? [];
      setWarnings(newWarnings);
      
      // Only redirect if no warnings; otherwise show them and let user confirm
      if (newWarnings.length === 0) {
        window.location.href = "/";
      } else {
        setShowWarnings(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSelectingId(null);
    }
  };

  const handleContinue = () => {
    setShowWarnings(false);
    setWarnings([]);
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notion データベースを選択</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          OAuth で許可されたデータベースから、論文保存先を選択してください。
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {warnings.length > 0 && showWarnings && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <AlertCircle size={16} /> プロパティ警告
          </div>
          <ul className="mb-4 list-inside list-disc space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mb-4 text-xs">これらのプロパティが不足しても続行できますが、データ保存時にエラーが発生する可能性があります。</p>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            <CheckCircle2 size={14} />
            続行
          </button>
        </div>
      )}

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)]">読み込み中…</p>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          共有済みデータベースが見つかりませんでした。Notion 側で Integration
          を対象DBに接続してください。
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-slate-100 p-2 text-sm">
                  {item.icon && typeof item.icon === "string" && item.icon.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="h-4 w-4"
                    />
                  ) : item.icon ? (
                    item.icon
                  ) : (
                    <Database size={16} />
                  )}
                </div>
                <h2 className="font-semibold">{item.title}</h2>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                {item.description || "説明なし"}
              </p>
              <button
                type="button"
                onClick={() => void selectDatabase(item.id)}
                disabled={Boolean(selectingId)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {selectingId === item.id ? "設定中…" : "このDBを使用"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
