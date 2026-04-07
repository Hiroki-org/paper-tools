"use client";

import { BookmarkPlus, Check, Loader2, RotateCcw } from "lucide-react";
import type { S2Paper } from "@paper-tools/core";
import { useSaveToNotion } from "@/hooks/useSaveToNotion";

interface SaveToNotionButtonProps {
  paper?: S2Paper;
  doi?: string;
  title?: string;
  saved?: boolean;
  onSaved?: () => void;
}

export default function SaveToNotionButton({
  paper,
  doi,
  title,
  saved = false,
  onSaved,
}: SaveToNotionButtonProps) {
  const { status, error, save } = useSaveToNotion({ paper, doi, title, saved, onSaved });

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
        onClick={save}
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
