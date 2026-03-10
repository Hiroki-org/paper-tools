"use client";

import { useState } from "react";
import Link from "next/link";
import type { Paper } from "@paper-tools/core";
import {
  User,
  Calendar,
  MapPin,
  ExternalLink,
  Link as LinkIcon,
  MessageSquareQuote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";

interface PaperCardProps {
  paper: Paper;
  actions?: React.ReactNode;
  detailHref?: string;
  onDetailNavigate?: () => void;
}

export default function PaperCard({
  paper,
  actions,
  detailHref,
  onDetailNavigate,
}: PaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAbstract = Boolean(paper.abstract);
  const authorText =
    paper.authors?.map((author) => author.name).join(", ") || "Unknown authors";

  const TitleContent = detailHref ? (
    <Link
      href={detailHref}
      onClick={onDetailNavigate}
      className="transition-colors hover:text-[var(--color-primary)]"
    >
      {paper.title}
    </Link>
  ) : paper.url ? (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-colors hover:text-[var(--color-primary)]"
    >
      {paper.title}
    </a>
  ) : paper.doi ? (
    <a
      href={`https://doi.org/${paper.doi}`}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-colors hover:text-[var(--color-primary)]"
    >
      {paper.title}
    </a>
  ) : (
    <span>{paper.title}</span>
  );

  const ExternalAnchor = paper.url ? (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in Semantic Scholar"
      title="Open in Semantic Scholar"
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-primary)]"
    >
      <ExternalLink size={15} />
    </a>
  ) : paper.doi ? (
    <a
      href={`https://doi.org/${paper.doi}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in DOI"
      title="Open in DOI"
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-primary)]"
    >
      <ExternalLink size={15} />
    </a>
  ) : null;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug text-[var(--color-text)]">
          {TitleContent}
        </h3>
        {ExternalAnchor}
      </header>

      <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
        <User size={16} className="mt-0.5 shrink-0 opacity-70" />
        <span className="line-clamp-2">{authorText}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        {paper.year && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
            <Calendar size={12} className="opacity-60" />
            {paper.year}
          </span>
        )}

        {paper.venue && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
            <MapPin size={12} className="opacity-60" />
            {paper.venue}
          </span>
        )}

        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 transition-colors hover:bg-blue-100"
          >
            <LinkIcon size={12} />
            DOI
          </a>
        )}

        {paper.citationCount != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <MessageSquareQuote size={12} />
            {paper.citationCount} citations
          </span>
        )}
      </div>

      {hasAbstract && (
        <section className="mt-4 rounded-xl bg-slate-50/90 p-3">
          <div
            className={clsx(
              "relative text-sm leading-6 text-slate-600 transition-all duration-300",
              !isExpanded && "line-clamp-3 max-h-[4.8em] overflow-hidden",
            )}
          >
            {paper.abstract}
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-slate-50/95 to-transparent" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp size={12} />
              </>
            ) : (
              <>
                Read abstract
                <ChevronDown size={12} />
              </>
            )}
          </button>
        </section>
      )}

      {paper.keywords && paper.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {paper.keywords.slice(0, 8).map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              {keyword}
            </span>
          ))}
          {paper.keywords.length > 8 && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-400">
              +{paper.keywords.length - 8}
            </span>
          )}
        </div>
      )}

      {actions && (
        <footer className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {actions}
        </footer>
      )}
    </article>
  );
}
