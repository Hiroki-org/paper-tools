import { useState, useCallback, useEffect } from "react";

type MinimalPaper = {
  doi?: string | null;
  title?: string | null;
  paperId?: string | null;
  externalIds?: {
    DOI?: string;
  } | null;
};

export function useSavedPapers() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const makeKeys = useCallback((paper: MinimalPaper) => {
    const keys: string[] = [];
    const doi = paper.doi || paper.externalIds?.DOI;
    if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
    if (paper.paperId?.trim()) keys.push(`s2:${paper.paperId.trim().toLowerCase()}`);
    if (paper.title?.trim()) keys.push(`title:${paper.title.trim().toLowerCase()}`);
    return keys;
  }, []);

  const isSaved = useCallback(
    (paper: MinimalPaper) =>
      makeKeys(paper).some((k) => savedKeys.has(k)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: MinimalPaper) => {
      const keys = makeKeys(paper);
      if (keys.length === 0) return;
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.add(k));
        return next;
      });
    },
    [makeKeys],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchArchive = async () => {
      try {
        const res = await fetch("/api/archive");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const next = new Set<string>();
        for (const record of data.records ?? []) {
          if (record.doi)
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
          if (record.semanticScholarId)
            next.add(`s2:${String(record.semanticScholarId).trim().toLowerCase()}`);
          if (record.title)
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
        }
        setSavedKeys(next);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to fetch archive:", err);
        }
      }
    };
    void fetchArchive();
    return () => {
      cancelled = true;
    };
  }, []);

  return { savedKeys, isSaved, markSaved };
}
