"use client";

import { useCallback, useState } from "react";
import type { S2Paper } from "@paper-tools/core";

interface SaveToNotionButtonProps {
  paper?: S2Paper;
  doi?: string;
  title?: string;
}

type SaveStatus = "idle" | "resolving" | "saving" | "done" | "error";

export default function SaveToNotionButton({
  paper,
  doi,
  title,
}: SaveToNotionButtonProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === "resolving" || status === "saving" || status === "done") {
      return;
    }

    setError(null);

    try {
      let targetPaper = paper;

      if (!targetPaper) {
        const trimmedDoi = doi?.trim();
        const trimmedTitle = title?.trim();

        if (!trimmedDoi && !trimmedTitle) {
          throw new Error("保存対象の DOI またはタイトルが見つかりません");
        }

        setStatus("resolving");
        const resolveRes = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            trimmedDoi ? { doi: trimmedDoi } : { title: trimmedTitle },
          ),
        });
        const resolveData = await resolveRes.json();
        if (!resolveRes.ok) {
          throw new Error(resolveData.error ?? "論文の解決に失敗しました");
        }
        targetPaper = resolveData.paper as S2Paper;
      }

      setStatus("saving");
      const archiveRes = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: targetPaper }),
      });
      const archiveData = await archiveRes.json();
      if (!archiveRes.ok) {
        throw new Error(archiveData.error ?? "Notionへの保存に失敗しました");
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [status, paper, doi, title]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "resolving" || status === "saving" || status === "done"}
        className="rounded border border-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "idle" && "📚 Notion に保存"}
        {status === "resolving" && "解決中…"}
        {status === "saving" && "保存中…"}
        {status === "done" && "✅ 保存済み"}
        {status === "error" && "再試行"}
      </button>
      {status === "error" && error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}