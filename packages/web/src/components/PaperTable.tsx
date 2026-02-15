import type { Paper } from "@paper-tools/core";

interface PaperTableProps {
  papers: Paper[];
  onSelect?: (paper: Paper) => void;
}

export default function PaperTable({ papers, onSelect }: PaperTableProps) {
  if (papers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        No papers found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-[var(--color-text-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Authors</th>
            <th className="px-4 py-3 font-medium">Year</th>
            <th className="px-4 py-3 font-medium">Venue</th>
            <th className="px-4 py-3 font-medium">Citations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {papers.map((paper, i) => (
            <tr
              key={paper.doi || `paper-${i}`}
              className={`bg-white transition-colors ${onSelect ? "cursor-pointer hover:bg-blue-50" : ""}`}
              onClick={() => onSelect?.(paper)}
            >
              <td className="max-w-md px-4 py-3 font-medium">
                <span className="line-clamp-2">{paper.title}</span>
              </td>
              <td className="max-w-xs px-4 py-3 text-[var(--color-text-muted)]">
                <span className="line-clamp-1">
                  {paper.authors?.map((a) => a.name).join(", ") || "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{paper.year || "—"}</td>
              <td className="max-w-[10rem] px-4 py-3 text-[var(--color-text-muted)]">
                <span className="line-clamp-1">{paper.venue || "—"}</span>
              </td>
              <td className="px-4 py-3">{paper.citationCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
