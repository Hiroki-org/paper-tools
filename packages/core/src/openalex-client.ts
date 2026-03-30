import { fetchWithRetry } from "./rate-limiter.js";

const OPENALEX_API_BASE = "https://api.openalex.org";

function getOpenAlexMailto(): string {
    const configured = process.env["OPENALEX_MAILTO"]?.trim();
    return configured && configured.length > 0
        ? configured
        : "muika0923@gmail.com";
}

const OPENALEX_MAILTO = getOpenAlexMailto();
const OPENALEX_USER_AGENT = `paper-tools-author-profiler (mailto:${OPENALEX_MAILTO})`;

export interface OpenAlexConcept {
    id: string;
    display_name: string;
    score: number;
}

export interface OpenAlexInstitution {
    id?: string;
    display_name: string;
    country_code?: string;
}

export interface OpenAlexAffiliation {
    institution: OpenAlexInstitution;
    years?: number[];
}

export interface OpenAlexCountByYear {
    year: number;
    works_count: number;
    cited_by_count: number;
}

export interface OpenAlexAuthor {
    id: string;
    display_name: string;
    display_name_alternatives?: string[];
    orcid?: string;
    last_known_institutions?: OpenAlexInstitution[];
    affiliations?: OpenAlexAffiliation[];
    x_concepts?: OpenAlexConcept[];
    works_count?: number;
    cited_by_count?: number;
    summary_stats?: {
        h_index?: number;
        i10_index?: number;
        two_year_mean_citedness?: number;
    };
    counts_by_year?: OpenAlexCountByYear[];
}

interface OpenAlexAuthorSearchResponse {
    results: OpenAlexAuthor[];
}

function buildHeaders(): Record<string, string> {
    return {
        Accept: "application/json",
        "User-Agent": OPENALEX_USER_AGENT,
    };
}

function normalizeAuthorId(authorId: string): string {
    const trimmed = authorId.trim();
    const fullUrlMatch = trimmed.match(/^https?:\/\/openalex\.org\/(A\d+)\/?$/i);
    if (fullUrlMatch?.[1]) {
        return fullUrlMatch[1].toUpperCase();
    }
    if (/^A\d+$/i.test(trimmed)) {
        return trimmed.toUpperCase();
    }
    return trimmed;
}

export async function getOpenAlexAuthor(authorId: string): Promise<OpenAlexAuthor> {
    const normalized = normalizeAuthorId(authorId);
    const url = `${OPENALEX_API_BASE}/authors/${encodeURIComponent(normalized)}?mailto=${encodeURIComponent(OPENALEX_MAILTO)}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAlex API error: ${response.status} ${response.statusText} - ${body}`);
    }

    const payload = await response.json();
    return payload as OpenAlexAuthor;
}

function scoreCandidate(candidate: OpenAlexAuthor, name?: string, affiliation?: string, orcid?: string): number {
    let score = 0;
    const candidateName = candidate.display_name?.toLowerCase() ?? "";
    const targetName = name?.toLowerCase() ?? "";
    const targetAffiliation = affiliation?.toLowerCase() ?? "";

    if (orcid && candidate.orcid && candidate.orcid.toLowerCase() === orcid.toLowerCase()) {
        score += 100;
    }

    if (targetName && candidateName === targetName) {
        score += 40;
    } else if (targetName && candidateName.includes(targetName)) {
        score += 20;
    }

    if (targetAffiliation) {
        const affiliationText = [
            ...(candidate.last_known_institutions ?? []).map((v) => v.display_name),
            ...(candidate.affiliations ?? []).map((v) => v.institution.display_name),
        ].join(" ").toLowerCase();

        if (affiliationText.includes(targetAffiliation)) {
            score += 15;
        }
    }

    score += Math.min(15, Math.floor((candidate.works_count ?? 0) / 50));
    return score;
}

export async function resolveOpenAlexAuthorId(options: {
    name: string;
    affiliation?: string;
    orcid?: string;
}): Promise<string | null> {
    const q = options.orcid?.trim() || options.name.trim();
    if (!q) {
        return null;
    }

    const params = new URLSearchParams({
        search: q,
        per_page: "10",
        mailto: OPENALEX_MAILTO,
    });

    const url = `${OPENALEX_API_BASE}/authors?${params}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAlex API error: ${response.status} ${response.statusText} - ${body}`);
    }

    const payload = await response.json() as OpenAlexAuthorSearchResponse;
    const ranked = (payload.results ?? [])
        .map((candidate) => ({
            candidate,
            score: scoreCandidate(candidate, options.name, options.affiliation, options.orcid),
        }))
        .sort((a, b) => b.score - a.score);

    return ranked[0]?.candidate.id ?? null;
}
