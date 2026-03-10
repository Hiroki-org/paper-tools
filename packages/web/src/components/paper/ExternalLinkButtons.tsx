import { ExternalLink, FileText, Globe } from "lucide-react";
import type { PaperDetail } from "@/types/paper";

type Props = {
  paper: PaperDetail;
};

export function ExternalLinkButtons({ paper }: Props) {
  const s2Url =
    paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`;
  const arxivId = paper.externalIds?.ArXiv;
  const doi = paper.externalIds?.DOI;

  const buttonClass =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <a
        href={s2Url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <Globe size={14} className="text-blue-500" />
        Semantic Scholar
        <ExternalLink size={12} className="opacity-40" />
      </a>
      {arxivId && (
        <a
          href={`https://arxiv.org/abs/${encodeURIComponent(arxivId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          <FileText size={14} className="text-red-500" />
          arXiv
          <ExternalLink size={12} className="opacity-40" />
        </a>
      )}
      {doi && (
        <a
          href={`https://doi.org/${encodeURIComponent(doi)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          <ExternalLink size={14} className="text-indigo-500" />
          DOI
        </a>
      )}
    </div>
  );
}
