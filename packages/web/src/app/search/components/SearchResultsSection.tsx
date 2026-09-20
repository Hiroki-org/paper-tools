import type { Paper } from "@paper-tools/core";
import SearchPaperList from "./SearchPaperList";

interface SearchResultsSectionProps {
  papers: Paper[];
  isSaved: (paper: Paper) => boolean;
  markSaved: (paper: Paper) => void;
  getGraphHref: (paper: Paper) => string;
  getRecommendHref: (paper: Paper) => string;
  getPaperId: (paper: Paper & { paperId?: string }) => string | null;
  preCacheFromPaper: (paper: Paper & { paperId?: string }, paperId: string) => void;
}

export default function SearchResultsSection({
  papers,
  isSaved,
  markSaved,
  getGraphHref,
  getRecommendHref,
  getPaperId,
  preCacheFromPaper,
}: SearchResultsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Search results
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
            Results ({papers.length})
          </h2>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          検索結果からそのまま詳細閲覧、グラフ化、推薦に進めます。
        </p>
      </div>

      <SearchPaperList
        papers={papers}
        isSaved={isSaved}
        markSaved={markSaved}
        getGraphHref={getGraphHref}
        getRecommendHref={getRecommendHref}
        getPaperId={getPaperId}
        preCacheFromPaper={preCacheFromPaper}
      />
    </section>
  );
}
