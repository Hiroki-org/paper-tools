"use client";

import { useState } from "react";
import { useBibtex } from "./useBibtex";

type Props = {
    doi?: string;
    title: string;
};

export function BibtexButton({ doi, title }: Props) {
    const { getSingleBibtex } = useBibtex();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        window.setTimeout(() => setToast(null), 2000);
    };

    const handleCopy = async () => {
        try {
            setLoading(true);
            const result = await getSingleBibtex({ doi, title });
            await navigator.clipboard.writeText(result.bibtex);
            showToast("success", "✓ Copied");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "BibTeX コピーに失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-flex items-center">
            <button
                type="button"
                onClick={handleCopy}
                disabled={loading}
                className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs transition-colors hover:bg-gray-100 disabled:opacity-60"
            >
                {loading ? "Copying..." : "BibTeX"}
            </button>
            {toast && (
                <span
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs text-white ${
                        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
                    }`}
                >
                    {toast.message}
                </span>
            )}
        </div>
    );
}
