import { RateLimiter, fetchWithRetry } from "./rate-limiter.js";
import type { Paper, Author } from "./types.js";

const DBLP_API_BASE = "https://dblp.org/search";

// DBLP allows ~1 request/second
const rateLimiter = new RateLimiter(1, 1000);

/**
 * DBLP API の検索結果ヒット
 */
interface DblpHitInfo {
    title?: string;
    authors?: { author: { text: string }[] | { text: string } };
    venue?: string;
    year?: string;
    doi?: string;
    url?: string;
    pages?: string;
}

interface DblpSearchResult {
    result: {
        hits: {
            "@total": string;
            hit?: Array<{
                info: DblpHitInfo;
            }>;
        };
    };
}

/**
 * DBLP API で論文を検索する
 */
export async function searchPublications(
    query: string,
    maxResults = 30,
): Promise<Paper[]> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        q: query,
        format: "json",
        h: String(maxResults),
    });

    const url = `${DBLP_API_BASE}/publ/api?${params}`;
    const response = await fetchWithRetry(url);
    const data: DblpSearchResult = await response.json() as DblpSearchResult;

    const hits = data.result?.hits?.hit ?? [];
    return hits.map((hit) => mapDblpHitToPaper(hit.info));
}

/**
 * DBLP API で会議の論文を検索する
 */
export async function searchVenuePublications(
    venueName: string,
    year?: number,
    maxResults = 100,
): Promise<Paper[]> {
    const query = year ? `${venueName} ${year}` : venueName;
    return searchPublications(query, maxResults);
}

/**
 * DBLP API で著者を検索する
 */
export async function searchAuthors(
    query: string,
    maxResults = 10,
): Promise<{ name: string; url: string }[]> {
    await rateLimiter.acquire();

    const params = new URLSearchParams({
        q: query,
        format: "json",
        h: String(maxResults),
    });

    const url = `${DBLP_API_BASE}/author/api?${params}`;
    const response = await fetchWithRetry(url);
    const data = await response.json() as {
        result: {
            hits: {
                hit?: Array<{ info: { author: string; url: string } }>;
            };
        };
    };

    const hits = data.result?.hits?.hit ?? [];
    return hits.map((hit) => ({
        name: hit.info?.author ?? "",
        url: hit.info?.url ?? "",
    }));
}

function mapDblpHitToPaper(info: DblpHitInfo): Paper {
    const authorsRaw = info.authors?.author;
    let authors: Author[] = [];
    if (Array.isArray(authorsRaw)) {
        authors = authorsRaw.map((a) => ({ name: a.text ?? String(a) }));
    } else if (authorsRaw) {
        authors = [{ name: authorsRaw.text ?? String(authorsRaw) }];
    }

    return {
        title: info.title?.replace(/\.$/, "") ?? "",
        authors,
        venue: info.venue,
        year: info.year ? parseInt(info.year, 10) : undefined,
        doi: info.doi,
        url: info.url,
        pages: info.pages,
    };
}
