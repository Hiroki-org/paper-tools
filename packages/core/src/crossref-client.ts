import { RateLimiter, fetchWithRetry } from "./rate-limiter.js";
import type { Paper, Author } from "./types.js";

const CROSSREF_API_BASE = "https://api.crossref.org";

// Crossref Polite Pool: ~50 req/s with mailto, ~1 req/s without
const rateLimiter = new RateLimiter(10, 1000);

function getMailto(): string | undefined {
    return process.env["CROSSREF_MAILTO"];
}

function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/json",
    };
    const mailto = getMailto();
    if (mailto) {
        headers["User-Agent"] = `paper-tools/0.1.0 (mailto:${mailto})`;
    }
    return headers;
}

interface CrossrefAuthor {
    given?: string;
    family?: string;
    name?: string;
    ORCID?: string;
    affiliation?: Array<{ name: string }>;
}

interface CrossrefWork {
    DOI?: string;
    title?: string[];
    author?: CrossrefAuthor[];
    "container-title"?: string[];
    published?: { "date-parts"?: number[][] };
    "published-print"?: { "date-parts"?: number[][] };
    abstract?: string;
    subject?: string[];
    URL?: string;
    page?: string;
    volume?: string;
    issue?: string;
    "is-referenced-by-count"?: number;
    "references-count"?: number;
}

/**
 * DOI で論文メタデータを取得する
 * 見つからない場合は null を返す
 */
export async function getWorkByDoi(doi: string): Promise<Paper | null> {
    await rateLimiter.acquire();

    const url = `${CROSSREF_API_BASE}/works/${encodeURIComponent(doi)}`;
    try {
        const response = await fetchWithRetry(url, { headers: buildHeaders() });
        const data = await response.json() as { message: CrossrefWork };
        return mapCrossrefWorkToPaper(data.message);
    } catch {
        return null;
    }
}

/**
 * キーワードで論文を検索する
 */
export async function searchWorks(
    query: string,
    maxResults = 20,
): Promise<Paper[]> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        query,
        rows: String(maxResults),
    });

    const mailto = getMailto();
    if (mailto) {
        params.set("mailto", mailto);
    }

    const url = `${CROSSREF_API_BASE}/works?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    const data = await response.json() as { message: { items: CrossrefWork[] } };
    return (data.message?.items ?? []).map(mapCrossrefWorkToPaper);
}

function mapCrossrefWorkToPaper(work: CrossrefWork): Paper {
    const authors: Author[] = (work.author ?? []).map((a) => ({
        name: a.name ?? [a.given, a.family].filter(Boolean).join(" "),
        orcid: a.ORCID,
        affiliations: a.affiliation?.map((aff) => aff.name),
    }));

    const dateParts = work.published?.["date-parts"]?.[0]
        ?? work["published-print"]?.["date-parts"]?.[0];
    const year = dateParts?.[0];

    return {
        title: work.title?.[0] ?? "",
        authors,
        doi: work.DOI,
        year,
        venue: work["container-title"]?.[0],
        abstract: work.abstract,
        keywords: work.subject,
        url: work.URL,
        pages: work.page,
        volume: work.volume,
        issue: work.issue,
        citationCount: work["is-referenced-by-count"],
        referenceCount: work["references-count"],
    };
}
