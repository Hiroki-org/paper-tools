import { fetchWithRetry, searchPapers, searchPublications } from "@paper-tools/core";
import type { BibtexIdentifier, FetchBibtexResult } from "./types.js";

function normalizeDoi(doi: string): string {
    return doi
        .trim()
        .replace(/^https?:\/\/doi\.org\//i, "")
        .replace(/^doi:/i, "")
        .trim();
}

function extractDblpKeyFromUrl(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/dblp\.org\/rec\/([^?#]+)/i);
    if (!match?.[1]) return null;
    return match[1].replace(/\.(html|xml|bib)$/i, "").trim();
}

async function fetchCrossrefBibtexByDoi(doi: string): Promise<string> {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}/transform/application/x-bibtex`;
    const response = await fetchWithRetry(url, {
        headers: {
            Accept: "application/x-bibtex",
        },
    });
    const text = (await response.text()).trim();
    if (!text.startsWith("@")) {
        throw new Error("Crossref returned non-BibTeX response");
    }
    return text;
}

async function fetchDblpBibtexByTitle(title: string): Promise<string | null> {
    const candidates = await searchPublications(title, 10);
    const candidate = candidates.find((paper) => extractDblpKeyFromUrl(paper.url));
    const dblpKey = extractDblpKeyFromUrl(candidate?.url);
    if (!dblpKey) return null;

    const url = `https://dblp.org/rec/${dblpKey}.bib?param=1`;
    const response = await fetchWithRetry(url, {
        headers: {
            Accept: "application/x-bibtex,text/plain;q=0.9,*/*;q=0.8",
        },
    });
    const text = (await response.text()).trim();
    return text.startsWith("@") ? text : null;
}

async function resolveDoiBySemanticScholarTitle(title: string): Promise<string | null> {
    const response = await searchPapers(title, "title,externalIds", 5);
    for (const paper of response.data ?? []) {
        const doi = paper.externalIds?.DOI;
        if (doi?.trim()) {
            return normalizeDoi(doi);
        }
    }
    return null;
}

export async function fetchBibtex(identifier: BibtexIdentifier): Promise<FetchBibtexResult | null> {
    const doi = identifier.doi?.trim() ? normalizeDoi(identifier.doi) : undefined;
    const title = identifier.title?.trim() || undefined;

    if (!doi && !title) {
        return null;
    }

    if (doi) {
        try {
            const bibtex = await fetchCrossrefBibtexByDoi(doi);
            return { bibtex, source: "crossref" };
        } catch (error) {
            const errorDetail = error instanceof Error ? error.message : String(error);
            console.warn("[bibtex] Crossref fetch failed", { doi, error: errorDetail });
            // fall through to title-based methods
        }
    }

    if (title) {
        try {
            const dblpBibtex = await fetchDblpBibtexByTitle(title);
            if (dblpBibtex) {
                return { bibtex: dblpBibtex, source: "dblp" };
            }
        } catch (error) {
            console.warn(`[bibtex] DBLP fetch failed for title \"${title}\":`, error instanceof Error ? error.message : error);
            // fall through to next method
        }

        try {
            const resolvedDoi = await resolveDoiBySemanticScholarTitle(title);
            if (resolvedDoi) {
                const bibtex = await fetchCrossrefBibtexByDoi(resolvedDoi);
                return { bibtex, source: "semanticScholar" };
            }
        } catch (error) {
            console.warn(`[bibtex] Semantic Scholar fallback failed for title \"${title}\":`, error instanceof Error ? error.message : error);
        }
    }

    return null;
}
