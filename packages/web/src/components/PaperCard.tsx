"use client";

import { useState } from "react";
import type { Paper } from "@paper-tools/core";
import {
  User,
  Calendar,
  MapPin,
  ExternalLink,
  Link as LinkIcon,
  MessageSquareQuote,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { clsx } from "clsx";

interface PaperCardProps {
  paper: Paper;
  actions?: React.ReactNode;
}

export default function PaperCard({ paper, actions }: PaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAbstract = !!paper.abstract;

  return (
    <div className="group relative flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200">

      {/* Title */}
      <h3 className="text-lg font-semibold leading-tight text-[var(--color-text)] pr-8">
        {paper.url ? (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] transition-colors flex items-start gap-2"
          >
            {paper.title}
            <ExternalLink size={16} className="mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : (
          paper.title
        )}
      </h3>

      {/* Authors */}
      <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
        <User size={16} className="mt-0.5 shrink-0 opacity-70" />
        <span className="line-clamp-2">
          {paper.authors?.map((a) => a.name).join(", ") || "Unknown authors"}
        </span>
      </div>

      {/* Metadata Chips */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[var(--color-text-muted)]">
        {paper.year && (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <Calendar size={12} className="opacity-60" />
            {paper.year}
          </span>
        )}
        {paper.venue && (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <MapPin size={12} className="opacity-60" />
            {paper.venue}
          </span>
        )}
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <LinkIcon size={12} />
            DOI
          </a>
        )}
        {paper.citationCount != null && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-green-700">
            <MessageSquareQuote size={12} />
            {paper.citationCount} citations
          </span>
        )}
      </div>

      {/* Abstract */}
      {hasAbstract && (
        <div className="mt-4">
          <div
            className={clsx(
              "text-sm leading-relaxed text-slate-600 transition-all duration-300 relative",
              !isExpanded && "line-clamp-3 max-h-[4.5em] overflow-hidden"
            )}
          >
             {paper.abstract}
             {!isExpanded && (
               <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
             )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline focus:outline-none"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp size={12} />
              </>
            ) : (
              <>
                Read abstract <ChevronDown size={12} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {paper.keywords.slice(0, 8).map((kw) => (
            <span
              key={kw}
              className="rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-100"
            >
              {kw}
            </span>
          ))}
          {paper.keywords.length > 8 && (
            <span className="rounded px-2 py-0.5 text-[10px] text-slate-400">
              +{paper.keywords.length - 8}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="mt-5 border-t border-slate-100 pt-3 flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
