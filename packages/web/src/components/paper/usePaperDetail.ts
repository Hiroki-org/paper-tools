"use client";

import { useEffect, useState } from "react";
import type { PaperDetail, PaperDetailPreview } from "@/types/paper";

const MAX_CACHE_ENTRIES = 100;
const paperCache = new Map<string, PaperDetail>();

function setCache(key: string, value: PaperDetail): void {
    if (!paperCache.has(key) && paperCache.size >= MAX_CACHE_ENTRIES) {
        const oldest = paperCache.keys().next().value as string | undefined;
        if (oldest) {
            paperCache.delete(oldest);
        }
    }
    paperCache.set(key, value);
}

function mergePaper(base: PaperDetail, patch: Partial<PaperDetail>): PaperDetail {
    return {
        ...base,
        ...patch,
        externalIds: { ...base.externalIds, ...(patch.externalIds ?? {}) },
        authors: patch.authors ?? base.authors,
        fieldsOfStudy: patch.fieldsOfStudy ?? base.fieldsOfStudy,
        journal: patch.journal ?? base.journal,
        tldr: patch.tldr ?? base.tldr,
    };
}

function previewToPaperDetail(preview: PaperDetailPreview): PaperDetail {
    return {
        paperId: preview.paperId,
        title: preview.title ?? "Untitled",
        abstract: preview.abstract ?? null,
        authors: preview.authors ?? [],
        year: preview.year ?? null,
        venue: preview.venue ?? "",
        citationCount: preview.citationCount ?? 0,
        influentialCitationCount: preview.influentialCitationCount ?? 0,
        referenceCount: preview.referenceCount ?? 0,
        externalIds: preview.externalIds ?? {},
        url: preview.url ?? `https://www.semanticscholar.org/paper/${preview.paperId}`,
        tldr: preview.tldr ?? null,
        fieldsOfStudy: preview.fieldsOfStudy ?? null,
        publicationDate: preview.publicationDate ?? null,
        journal: preview.journal ?? null,
    };
}

export function preCachePaper(preview: PaperDetailPreview): void {
    const existing = paperCache.get(preview.paperId);
    const partial = previewToPaperDetail(preview);
    if (existing) {
        setCache(preview.paperId, mergePaper(existing, partial));
        return;
    }
    setCache(preview.paperId, partial);
}

export function usePaperDetail(paperId: string | null) {
    const [paper, setPaper] = useState<PaperDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!paperId) {
            setPaper(null);
            setError(null);
            setLoading(false);
            return;
        }

        const cached = paperCache.get(paperId);
        if (cached) {
            setPaper(cached);
        }

        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/paper/${encodeURIComponent(paperId)}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error ?? "Failed to load paper detail");
                }
                if (cancelled) return;
                const merged = cached ? mergePaper(cached, data as PaperDetail) : (data as PaperDetail);
                setCache(paperId, merged);
                setPaper(merged);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [paperId]);

    return { paper, loading, error };
}
