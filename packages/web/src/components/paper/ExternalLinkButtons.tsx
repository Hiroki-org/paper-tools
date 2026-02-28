"use client";

import type { PaperDetail } from "@/types/paper";

type Props = {
  paper: PaperDetail;
};

export function ExternalLinkButtons({ paper }: Props) {
  const s2Url =
    paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`;
  const arxivId = paper.externalIds?.ArXiv;
  const doi = paper.externalIds?.DOI;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={s2Url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Open in S2 ↗
      </a>
      {arxivId && (
        <a
          href={`https://arxiv.org/abs/${encodeURIComponent(arxivId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          arXiv ↗
        </a>
      )}
      {doi && (
        <a
          href={`https://doi.org/${encodeURIComponent(doi)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          DOI ↗
        </a>
      )}
    </div>
  );
}
