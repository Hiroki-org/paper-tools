import { useState, useCallback, useEffect } from "react";
import type { Paper } from "@paper-tools/core";

let cachedKeys: Set<string> | null = null;
let fetchPromise: Promise<Set<string>> | null = null;

export function useSavedPapers() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(
    () => cachedKeys ?? new Set(),
  );

  const makeKeys = useCallback((doi?: string, title?: string) => {
    const keys: string[] = [];
    if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
    if (title?.trim()) keys.push(`title:${title.trim().toLowerCase()}`);
    return keys;
  }, []);

  const isSaved = useCallback(
    (paper: Paper) =>
      makeKeys(paper.doi, paper.title).some((k) => savedKeys.has(k)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: Paper) => {
      const keys = makeKeys(paper.doi, paper.title);
      if (keys.length === 0) return;

      const applyKeys = (target: Set<string>) => {
        keys.forEach((k) => target.add(k));
      };

      if (cachedKeys) {
        applyKeys(cachedKeys);
      }

      setSavedKeys((prev) => {
        const next = new Set(prev);
        applyKeys(next);
        return next;
      });
    },
    [makeKeys],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchArchive = async () => {
      if (cachedKeys) {
        setSavedKeys(new Set(cachedKeys));
        return;
      }

      if (!fetchPromise) {
        fetchPromise = fetch("/api/archive")
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error("Failed to fetch archive");
            const next = new Set<string>();
            for (const record of data.records ?? []) {
              if (record.doi)
                next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
              if (record.title)
                next.add(`title:${String(record.title).trim().toLowerCase()}`);
            }
            cachedKeys = next;
            return next;
          })
          .finally(() => {
            fetchPromise = null;
          });
      }

      try {
        const next = await fetchPromise;
        if (!cancelled) {
          setSavedKeys(new Set(next));
        }
      } catch (err) {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("Failed to fetch archive:", err);
        }
      }
    };

    void fetchArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isSaved, markSaved };
}
