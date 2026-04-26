import { BookOpen, Calendar, MapPin, Quote } from "lucide-react";
import type { PaperDetail } from "@/types/paper";

type PaperHeaderProps = {
  paper: PaperDetail;
};

export function PaperHeader({ paper }: PaperHeaderProps) {
  return (
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
  );
}
