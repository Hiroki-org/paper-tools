import { ArrowLeft, BookOpen, Calendar, Info, MapPin, Quote } from "lucide-react";
import { useState } from "react";
import type { S2Paper } from "@paper-tools/core";
import { BibtexButton } from "@/components/bibtex/BibtexButton";
import SaveToNotionButton from "@/components/SaveToNotionButton";
import TagInput from "@/components/TagInput";
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
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95"
        >
          <ArrowLeft size={14} />
          戻る
        </button>
        <ExternalLinkButtons paper={paper} />
      </div>

      <header className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          {paper.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            <span className="text-slate-700">
              {paper.authors.length > 5
                ? `${paper.authors.slice(0, 5).map((a) => a.name).join(", ")} et al.`
                : paper.authors.map((a) => a.name).join(", ")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <span>{paper.venue || "Venue unknown"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span>{paper.year || "Year unknown"}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">
            <Quote size={14} />
            <span>
              {paper.citationCount} citations
              {paper.influentialCitationCount > 0 &&
                ` (${paper.influentialCitationCount} influential)`}
            </span>
          </div>
        </div>
      </header>

      {paper.tldr?.text && (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-800">
            <div className="rounded-lg bg-blue-500 p-1 text-white">
              <Quote size={14} />
            </div>
            TLDR
          </h2>
          <blockquote className="text-lg font-medium leading-relaxed text-blue-900">
            "{paper.tldr.text}"
          </blockquote>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Abstract</h2>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 leading-relaxed text-slate-700 shadow-sm backdrop-blur-sm">
            {paper.abstract ? (
              <p className="whitespace-pre-wrap text-base leading-8">
                {paper.abstract}
              </p>
            ) : (
              <p className="italic text-slate-400">Abstract not available</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <Info size={20} className="text-slate-400" />
              Details
            </h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Fields of Study
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fields.length > 0 ? (
                    fields.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {f.category}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">N/A</span>
                  )}
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  DOI
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {doi ?? "N/A"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Published
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {paper.publicationDate ?? paper.year ?? "N/A"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Stats
                </p>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-bold text-slate-900">
                      {paper.citationCount}
                    </p>
                    <p className="text-[10px] uppercase text-slate-500">
                      Citations
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">
                      {paper.referenceCount}
                    </p>
                    <p className="text-[10px] uppercase text-slate-500">
                      References
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
                Tags
              </h2>
              <TagInput value={tags} onChange={setTags} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
              Actions
            </h2>
            <div className="grid gap-2">
              <SaveToNotionButton paper={toS2Paper(paper)} tags={tags} />
              <BibtexButton doi={doi} title={paper.title} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
