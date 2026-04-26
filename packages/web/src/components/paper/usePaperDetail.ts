"use client";

import useSWR, { mutate } from "swr";
import type { PaperDetail, PaperDetailPreview } from "@/types/paper";

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

function previewToPaperDetailPatch(preview: PaperDetailPreview): Partial<PaperDetail> {
    const patch: Partial<PaperDetail> = {
        paperId: preview.paperId,
    };

    if (preview.title !== undefined) patch.title = preview.title;
    if (preview.abstract !== undefined) patch.abstract = preview.abstract;
    if (preview.authors !== undefined) patch.authors = preview.authors;
    if (preview.year !== undefined) patch.year = preview.year;
    if (preview.venue !== undefined) patch.venue = preview.venue;
    if (preview.citationCount !== undefined) patch.citationCount = preview.citationCount;
    if (preview.influentialCitationCount !== undefined) {
        patch.influentialCitationCount = preview.influentialCitationCount;
    }
    if (preview.referenceCount !== undefined) patch.referenceCount = preview.referenceCount;
    if (preview.externalIds !== undefined) patch.externalIds = preview.externalIds;
    if (preview.url !== undefined) patch.url = preview.url;
    if (preview.tldr !== undefined) patch.tldr = preview.tldr;
    if (preview.fieldsOfStudy !== undefined) patch.fieldsOfStudy = preview.fieldsOfStudy;
    if (preview.publicationDate !== undefined) patch.publicationDate = preview.publicationDate;
    if (preview.journal !== undefined) patch.journal = preview.journal;

    return patch;
}

export function preCachePaper(preview: PaperDetailPreview): void {
    void mutate(
        preview.paperId,
        (currentData: PaperDetail | undefined) =>
            currentData
                ? mergePaper(currentData, previewToPaperDetailPatch(preview))
                : previewToPaperDetail(preview),
        { revalidate: false }
    );
}

async function fetchAndMergePaper(paperId: string): Promise<PaperDetail> {
    const res = await fetch(`/api/paper/${encodeURIComponent(paperId)}`);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error ?? "Failed to load paper detail");
    }
    return data as PaperDetail;
}

export function usePaperDetail(paperId: string | null) {
    const { data, error, isLoading } = useSWR(
        paperId,
        fetchAndMergePaper,
        {
            revalidateOnFocus: false, // Prevents excessive re-fetching since papers rarely change
            dedupingInterval: 60000,
        }
    );

    return {
        paper: data ?? null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Unknown error") : null,
    };
}
