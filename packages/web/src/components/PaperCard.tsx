import type { Paper } from "@paper-tools/core";

interface PaperCardProps {
  paper: Paper;
  actions?: React.ReactNode;
}

export default function PaperCard({ paper, actions }: PaperCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-base font-semibold leading-snug text-[var(--color-text)]">
        {paper.url ? (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] hover:underline"
          >
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h3>

      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {paper.authors?.map((a) => a.name).join(", ") || "Unknown authors"}
      </p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
        {paper.year && <span className="rounded bg-slate-100 px-2 py-0.5">{paper.year}</span>}
        {paper.venue && <span className="rounded bg-slate-100 px-2 py-0.5">{paper.venue}</span>}
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-blue-50 px-2 py-0.5 text-[var(--color-primary)] hover:underline"
          >
            DOI
          </a>
        )}
        {paper.citationCount != null && (
          <span className="rounded bg-green-50 px-2 py-0.5">
            🔗 {paper.citationCount} citations
          </span>
        )}
      </div>

      {paper.abstract && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {paper.abstract}
        </p>
      )}

      {paper.keywords && paper.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {paper.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
