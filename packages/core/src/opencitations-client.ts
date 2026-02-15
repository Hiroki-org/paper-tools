import { RateLimiter, fetchWithRetry } from "./rate-limiter.js";
import type { Citation } from "./types.js";

const OPENCITATIONS_API_BASE = "https://opencitations.net/index/coci/api/v1";

// OpenCitations: be conservative with rate limiting
const rateLimiter = new RateLimiter(5, 1000);

interface OpenCitationEntry {
    citing: string;
    cited: string;
    creation?: string;
}

async function fetchByEndpoint(endpoint: "citations" | "references", doi: string): Promise<Citation[]> {
    await rateLimiter.acquire();

    const url = `${OPENCITATIONS_API_BASE}/${endpoint}/${encodeURIComponent(doi)}`;
    try {
        const response = await fetchWithRetry(url);
        const data = await response.json() as OpenCitationEntry[];

        return data.map((entry) => ({
            citing: entry.citing,
            cited: entry.cited,
            creationDate: entry.creation,
        }));
    } catch (error) {
        console.error(`[opencitations] failed to fetch ${endpoint} for DOI ${doi}:`, error);
        return [];
    }
}

/**
 * DOI の被引用（この論文を引用している論文）を取得する
 */
export async function getCitations(doi: string): Promise<Citation[]> {
    return fetchByEndpoint("citations", doi);
}

/**
 * DOI の引用先（この論文が引用している論文）を取得する
 */
export async function getReferences(doi: string): Promise<Citation[]> {
    return fetchByEndpoint("references", doi);
}
