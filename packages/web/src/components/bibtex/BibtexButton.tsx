import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useBibtex } from "./useBibtex";

type Props = {
  doi?: string;
  title: string;
};

export function BibtexButton({ doi, title }: Props) {
  const { getSingleBibtex } = useBibtex();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      setLoading(true);
      const result = await getSingleBibtex({ doi, title });
      await navigator.clipboard.writeText(result.bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy BibTeX:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-400" />
      ) : copied ? (
        <Check size={14} className="text-emerald-500" />
      ) : (
        <Copy size={14} className="text-slate-400" />
      )}
      <span>{copied ? "Copied" : "BibTeX"}</span>
    </button>
  );
}
