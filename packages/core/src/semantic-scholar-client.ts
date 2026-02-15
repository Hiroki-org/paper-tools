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

let cachedLimiter: RateLimiter | undefined;
let cachedKeyState: "key" | "no-key" | undefined;

function getRateLimiter(): RateLimiter {
    const hasApiKey = !!process.env["S2_API_KEY"];
    const state: "key" | "no-key" = hasApiKey ? "key" : "no-key";
    if (cachedLimiter && cachedKeyState === state) {
        return cachedLimiter;
    }
    cachedKeyState = state;
    cachedLimiter = hasApiKey
        ? new RateLimiter(10, 1000)
        : new RateLimiter(1, 3000);
    return cachedLimiter;
}

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

async function parseResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
        return await response.json() as T;
    }

    const bodyText = await response.text();
    throw new Error(
        `Semantic Scholar API error: ${response.status} ${response.statusText} - ${bodyText}`,
    );
}

export async function getRecommendationsForPaper(
    paperId: string,
    options: S2RecommendationOptions = {},
): Promise<S2RecommendationsResponse> {
    await getRateLimiter().acquire();

    const params = new URLSearchParams({
        fields: options.fields ?? S2_DEFAULT_FIELDS,
        limit: String(options.limit ?? 10),
    });
    if (options.from) {
        params.set("from", options.from);
    }

    const url = `${SEMANTIC_SCHOLAR_API_BASE}/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await parseResponse<S2RecommendationsResponse>(response);
}

export async function getRecommendations(
    positivePaperIds: string[],
    negativePaperIds: string[] = [],
    options: Omit<S2RecommendationOptions, "from"> = {},
): Promise<S2RecommendationsResponse> {
    await getRateLimiter().acquire();

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
    return await parseResponse<S2RecommendationsResponse>(response);
}

export async function getPaper(
    paperId: string,
    fields = S2_DEFAULT_FIELDS,
): Promise<S2Paper> {
    await getRateLimiter().acquire();

    const params = new URLSearchParams({ fields });
    const url = `${SEMANTIC_SCHOLAR_API_BASE}/graph/v1/paper/${encodeURIComponent(paperId)}?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await parseResponse<S2Paper>(response);
}

export async function searchPapers(
    query: string,
    fields = S2_DEFAULT_FIELDS,
    limit = 1,
): Promise<S2SearchResponse> {
    await getRateLimiter().acquire();

    const params = new URLSearchParams({
        query,
        fields,
        limit: String(limit),
    });
    const url = `${SEMANTIC_SCHOLAR_API_BASE}/graph/v1/paper/search?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    return await parseResponse<S2SearchResponse>(response);
}