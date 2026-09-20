"use client";

import { useState, useCallback } from "react";
import type { Paper } from "@paper-tools/core";
import { preCachePaper } from "@/components/paper/usePaperDetail";
import { useSavedPapers } from "./hooks/useSavedPapers";
import SearchHeader from "./components/SearchHeader";
import DrilldownSection from "./components/DrilldownSection";
import SearchResultsSection from "./components/SearchResultsSection";

export const fieldClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10";

type SearchPaper = Paper & {
  paperId?: string;
};

export default function SearchPage() {
  const { isSaved, markSaved } = useSavedPapers();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (query: string, maxResults: number) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        );
        const contentType = res.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : { error: await res.text() };

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" && data.error.trim().length > 0
              ? data.error
              : `Search failed (HTTP ${res.status})`,
          );
        }

        setPapers(data.papers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPapers([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getGraphHref = useCallback((paper: Paper) => {
    if (paper.doi) {
      return `/graph?doi=${encodeURIComponent(paper.doi)}`;
    }
    return `/graph?title=${encodeURIComponent(paper.title)}`;
  }, []);

  const getRecommendHref = useCallback((paper: Paper) => {
    const base = paper.doi?.trim() || paper.title?.trim() || "";
    return `/recommend${base ? `?paperId=${encodeURIComponent(base)}` : ""}`;
  }, []);

  const getPaperId = useCallback((paper: SearchPaper): string | null => {
    const manualId = paper.paperId?.trim();
    if (manualId) return manualId;

    if (!paper.url && paper.doi) {
      return paper.doi;
    }
    if (!paper.url) {
      return null;
    }

    try {
      const url = new URL(paper.url);
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === "semanticscholar.org" ||
        hostname === "www.semanticscholar.org"
      ) {
        const paperIndex = url.pathname.toLowerCase().indexOf("/paper/");
        if (paperIndex !== -1) {
          const afterPaper = url.pathname.substring(
            paperIndex + "/paper/".length,
          );
          const segments = afterPaper.split("/").filter(Boolean);
          const lastSegment = segments[segments.length - 1];
          if (lastSegment) {
            return decodeURIComponent(lastSegment);
          }
        }
      }
    } catch {
      // Fall back to regex parsing below.
    }

    const match = paper.url.match(/\/paper\/(?:[^/?#]+\/)?([^/?#]+)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }

    if (paper.doi) {
      return paper.doi;
    }

    return null;
  }, []);

  const preCacheFromPaper = useCallback(
    (paper: SearchPaper, paperId: string) => {
      preCachePaper({
        paperId,
        title: paper.title,
        authors: (paper.authors ?? []).map((author) => ({
          authorId: "",
          name: author.name,
        })),
        year: paper.year ?? null,
        venue: paper.venue ?? "",
        citationCount: paper.citationCount ?? 0,
        externalIds: paper.doi ? { DOI: paper.doi } : {},
        url: paper.url ?? `https://www.semanticscholar.org/paper/${paperId}`,
        abstract: paper.abstract ?? null,
      });
    },
    [],
  );

  return (
    <div className="space-y-8">
      <SearchHeader onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {papers.length > 0 && (
        <>
          <DrilldownSection
            papers={papers}
            isSaved={isSaved}
            markSaved={markSaved}
            getGraphHref={getGraphHref}
            getRecommendHref={getRecommendHref}
            getPaperId={getPaperId}
            preCacheFromPaper={preCacheFromPaper}
            fieldClassName={fieldClassName}
          />

          <SearchResultsSection
            papers={papers}
            isSaved={isSaved}
            markSaved={markSaved}
            getGraphHref={getGraphHref}
            getRecommendHref={getRecommendHref}
            getPaperId={getPaperId}
            preCacheFromPaper={preCacheFromPaper}
          />
        </>
      )}
    </div>
  );
}
