"use client";

import type { S2Paper } from "@paper-tools/core";
import { BibtexButton } from "@/components/bibtex/BibtexButton";
import SaveToNotionButton from "@/components/SaveToNotionButton";
import { ExternalLinkButtons } from "@/components/paper/ExternalLinkButtons";
import type { PaperDetail } from "@/types/paper";

type Props = {
  paper: PaperDetail;
  onBack: () => void;
};

function toS2Paper(detail: PaperDetail): S2Paper {
  return {
    paperId: detail.paperId,
    title: detail.title,
    abstract: detail.abstract ?? undefined,
    year: detail.year ?? undefined,
    venue: detail.venue,
    citationCount: detail.citationCount,
    referenceCount: detail.referenceCount,
    externalIds: {
      DOI: detail.externalIds.DOI,
      ArXiv: detail.externalIds.ArXiv,
      ACL: detail.externalIds.ACL,
      CorpusId: detail.externalIds.CorpusId
        ? String(detail.externalIds.CorpusId)
        : undefined,
    },
    authors: detail.authors,
    fieldsOfStudy: detail.fieldsOfStudy?.map((f) => f.category),
  };
}

export function PaperDetailView({ paper, onBack }: Props) {
  const doi = paper.externalIds?.DOI;
  const fields = paper.fieldsOfStudy ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          ← 戻る
        </button>
        <ExternalLinkButtons paper={paper} />
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{paper.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {paper.authors.map((a) => a.name).join(", ") || "Unknown authors"}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {paper.venue || "Venue unknown"}
          {paper.year ? ` · ${paper.year}` : ""}
          {` · Cited by ${paper.citationCount} (${paper.influentialCitationCount} influential)`}
        </p>
      </header>

      {paper.tldr?.text ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">TLDR</h2>
          <blockquote className="rounded border-l-4 border-[var(--color-primary)] bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {paper.tldr.text}
          </blockquote>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Abstract</h2>
        {paper.abstract ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {paper.abstract}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Abstract not available</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          <p>
            <span className="font-medium">研究分野:</span>{" "}
            {fields.length > 0
              ? fields.map((f) => f.category).join(", ")
              : "N/A"}
          </p>
          <p>
            <span className="font-medium">DOI:</span> {doi ?? "N/A"}
          </p>
          <p>
            <span className="font-medium">Published:</span>{" "}
            {paper.publicationDate ?? "N/A"}
          </p>
          <p>
            <span className="font-medium">References:</span>{" "}
            {paper.referenceCount}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        <BibtexButton doi={doi} title={paper.title} />
        <SaveToNotionButton paper={toS2Paper(paper)} />
      </div>
    </div>
  );
}
