import type { Paper } from "@paper-tools/core";
import PaperCard from "@/components/PaperCard";
import SaveToNotionButton from "@/components/SaveToNotionButton";

type SearchPaper = Paper & {
  paperId?: string;
};

interface SearchPaperListProps {
  papers: SearchPaper[];
  isSaved: (paper: Paper) => boolean;
  markSaved: (paper: Paper) => void;
  getGraphHref: (paper: Paper) => string;
  getRecommendHref: (paper: Paper) => string;
  getPaperId: (paper: SearchPaper) => string | null;
  preCacheFromPaper: (paper: SearchPaper, paperId: string) => void;
}

export default function SearchPaperList({
  papers,
  isSaved,
  markSaved,
  getGraphHref,
  getRecommendHref,
  getPaperId,
  preCacheFromPaper,
}: SearchPaperListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {papers.map((p, i) => {
        const paper = p as SearchPaper;
        const paperId = getPaperId(paper);
        return (
          <PaperCard
            key={i}
            paper={paper}
            detailHref={
              paperId ? `/paper/${encodeURIComponent(paperId)}` : undefined
            }
            onDetailNavigate={
              paperId
                ? () => {
                    preCacheFromPaper(paper, paperId);
                  }
                : undefined
            }
            actions={
              <>
                <SaveToNotionButton
                  doi={paper.doi}
                  title={paper.title}
                  saved={isSaved(paper)}
                  onSaved={() => markSaved(paper)}
                />
                <a
                  href={getGraphHref(paper)}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  🕸️ グラフを見る
                </a>
                <a
                  href={getRecommendHref(paper)}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  ✨ おすすめ
                </a>
              </>
            }
          />
        );
      })}
    </div>
  );
}
