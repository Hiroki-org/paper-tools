"use client";

import { BookmarkPlus, Check, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import type { S2Paper } from "@paper-tools/core";

interface SaveToNotionButtonProps {
  paper?: S2Paper;
  doi?: string;
  title?: string;
  saved?: boolean;
  onSaved?: () => void;
}

type SaveStatus = "idle" | "resolving" | "saving" | "done" | "error";

export default function SaveToNotionButton({
  paper,
  doi,
  title,
  saved = false,
  onSaved,
}: SaveToNotionButtonProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (
      saved ||
      status === "resolving" ||
      status === "saving" ||
      status === "done"
    ) {
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

        targetPaper = resolveData.paper as S2Paper | undefined;
        if (!targetPaper) {
          throw new Error("保存対象の論文を取得できませんでした");
        }
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
      onSaved?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [status, paper, doi, title, saved, onSaved]);

  const disabled =
    saved || status === "resolving" || status === "saving" || status === "done";

  const buttonClassName = [
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-colors",
    disabled ? "cursor-not-allowed" : "",
    saved || status === "done"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "error"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-slate-50",
  ].join(" ");

  const renderIcon = () => {
    if (saved || status === "done") {
      return <Check size={14} />;
    }
    if (status === "resolving" || status === "saving") {
      return <Loader2 size={14} className="animate-spin" />;
    }
    if (status === "error") {
      return <RotateCcw size={14} />;
    }
    return <BookmarkPlus size={14} />;
  };

  const renderLabel = () => {
    if (saved) return "Saved to Notion";
    if (status === "idle") return "Save to Notion";
    if (status === "resolving") return "Preparing…";
    if (status === "saving") return "Saving…";
    if (status === "done") return "Saved";
    return "Retry save";
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={buttonClassName}
      >
        {renderIcon()}
        <span>{renderLabel()}</span>
      </button>

      {status === "error" && error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
