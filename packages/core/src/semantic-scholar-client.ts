import { RateLimiter, fetchWithRetry } from "./rate-limiter.js";

const SEMANTIC_SCHOLAR_API_BASE = "https://api.semanticscholar.org";

export const S2_DEFAULT_FIELDS = [
    "paperId",
    "externalIds",
    "title",
    "abstract",
    "year",
    "authors",
    "venue",
    "referenceCount",
    "citationCount",
    "isOpenAccess",
    "openAccessPdf",
    "fieldsOfStudy",
].join(",");

export interface S2Author {
    authorId?: string;
    name: string;
}

export interface S2ExternalIds {
    DOI?: string;
    ArXiv?: string;
    MAG?: string;
    ACL?: string;
    PMID?: string;
    CorpusId?: string;
    [key: string]: string | undefined;
}

export interface S2OpenAccessPdf {
    url?: string;
    status?: string;
}

export interface S2Paper {
    paperId: string;
    title: string;
    abstract?: string;
    year?: number;
    authors?: S2Author[];
    externalIds?: S2ExternalIds;
    venue?: string;
    referenceCount?: number;
    citationCount?: number;
    isOpenAccess?: boolean;
    openAccessPdf?: S2OpenAccessPdf;
    fieldsOfStudy?: string[];
}

export interface S2RecommendationsResponse {
    recommendedPapers: S2Paper[];
}

export interface S2RecommendationOptions {
    fields?: string;
    limit?: number;
    from?: "recent" | "all-cs";
}

export interface S2SearchResponse {
    total: number;
    offset: number;
    next?: number;
    data: S2Paper[];
}

const rateLimiter = new RateLimiter(process.env["S2_API_KEY"] ? 10 : 1, 1000);

function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    const apiKey = process.env["S2_API_KEY"];
    if (apiKey) {
        headers["x-api-key"] = apiKey;
    }
    return headers;
}

export async function getRecommendationsForPaper(
    paperId: string,
    options: S2RecommendationOptions = {},
): Promise<S2RecommendationsResponse> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        fields: options.fields ?? S2_DEFAULT_FIELDS,
        limit: String(options.limit ?? 10),
    });
    if (options.from) {
        params.set("from", options.from);
    }

    const url = `${SEMANTIC_SCHOLAR_API_BASE}/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await response.json() as S2RecommendationsResponse;
}

export async function getRecommendations(
    positivePaperIds: string[],
    negativePaperIds: string[] = [],
    options: Omit<S2RecommendationOptions, "from"> = {},
): Promise<S2RecommendationsResponse> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        fields: options.fields ?? S2_DEFAULT_FIELDS,
        limit: String(options.limit ?? 20),
    });

    const url = `${SEMANTIC_SCHOLAR_API_BASE}/recommendations/v1/papers/?${params}`;
    const response = await fetchWithRetry(url, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
            positivePaperIds,
            negativePaperIds,
        }),
    });
    return await response.json() as S2RecommendationsResponse;
}

export async function getPaper(
    paperId: string,
    fields = S2_DEFAULT_FIELDS,
): Promise<S2Paper> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({ fields });
    const url = `${SEMANTIC_SCHOLAR_API_BASE}/graph/v1/paper/${encodeURIComponent(paperId)}?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await response.json() as S2Paper;
}

export async function searchPapers(
    query: string,
    fields = S2_DEFAULT_FIELDS,
    limit = 1,
): Promise<S2SearchResponse> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        query,
        fields,
        limit: String(limit),
    });
    const url = `${SEMANTIC_SCHOLAR_API_BASE}/graph/v1/paper/search?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await response.json() as S2SearchResponse;
}