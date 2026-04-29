import { Info } from "lucide-react";
import type { PaperDetail } from "@/types/paper";

type PaperDetailsProps = {
  paper: PaperDetail;
  fields: { category: string }[];
  doi: string | undefined;
};

export function PaperDetails({ paper, fields, doi }: PaperDetailsProps) {
  return (
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
  );
}
