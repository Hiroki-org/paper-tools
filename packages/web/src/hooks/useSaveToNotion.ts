import { useCallback, useState } from "react";
import type { S2Paper } from "@paper-tools/core";

export type SaveStatus = "idle" | "resolving" | "saving" | "done" | "error";

interface UseSaveToNotionProps {
  paper?: S2Paper;
  doi?: string;
  title?: string;
  saved?: boolean;
  onSaved?: () => void;
}

export function useSaveToNotion({
  paper,
  doi,
  title,
  saved = false,
  onSaved,
}: UseSaveToNotionProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
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

  return { status, error, save };
}
