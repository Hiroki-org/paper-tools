import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import {
    getAuthor,
    getAuthorPapers,
    getOpenAlexAuthor,
    resolveOpenAlexAuthorId,
    type Affiliation,
    type AuthorProfile,
    type Paper,
    type S2Paper,
    type TopicTimelineEntry,
} from "@paper-tools/core";
import { aggregateCoauthorsFromPapers } from "./coauthor-network.js";

export interface BuildAuthorProfileOptions {
    paperLimit?: number;
    topPapers?: number;
    forceRefresh?: boolean;
    cacheTtlMs?: number;
}

interface ProfileCacheItem {
    updatedAt: string;
    profile: AuthorProfile;
}

type ProfileCache = Record<string, ProfileCacheItem>;
const inFlightProfiles = new Map<string, Promise<AuthorProfile>>();

const CACHE_DIR = join(homedir(), ".paper-tools", "author-profiler");
const PROFILE_CACHE_FILE = join(CACHE_DIR, "profile-cache.json");
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function toCorePaper(paper: S2Paper): Paper {
    return {
        title: paper.title,
        authors: (paper.authors ?? []).map((a) => ({ name: a.name })),
        doi: paper.externalIds?.DOI,
        year: paper.year,
        venue: paper.venue,
        abstract: paper.abstract,
        url: paper.url,
        citationCount: paper.citationCount,
        referenceCount: paper.referenceCount,
        keywords: paper.fieldsOfStudy,
    };
}

function toAffiliations(values?: string[]): Affiliation[] {
    return (values ?? [])
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
}

export function mergeAffiliations(base: Affiliation[], other: Affiliation[]): Affiliation[] {
    const keys = new Set<string>();
    const merged: Affiliation[] = [];

    for (const item of [...base, ...other]) {
        const key = `${item.name.toLowerCase()}#${item.year ?? ""}`;
        if (keys.has(key)) {
            continue;
        }
        keys.add(key);
        merged.push(item);
    }

    return merged;
}

export function buildTopicTimelineFromPapers(papers: S2Paper[]): TopicTimelineEntry[] {
    const yearly = new Map<number, Map<string, number>>();

    for (const paper of papers) {
        if (!paper.year || !Array.isArray(paper.fieldsOfStudy)) {
            continue;
        }

        const topics = yearly.get(paper.year) ?? new Map<string, number>();
        for (const topic of paper.fieldsOfStudy) {
            const current = topics.get(topic) ?? 0;
            topics.set(topic, current + 1);
        }
        yearly.set(paper.year, topics);
    }

    return [...yearly.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([year, topicMap]) => {
            const total = [...topicMap.values()].reduce((acc, v) => acc + v, 0) || 1;
            const topics = [...topicMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({
                    name,
                    score: Number((count / total).toFixed(4)),
                }));
            return { year, topics };
        });
}

async function readCache(): Promise<ProfileCache> {
    try {
        const raw = await readFile(PROFILE_CACHE_FILE, "utf-8");
        return JSON.parse(raw) as ProfileCache;
    } catch {
        return {};
    }
}

async function writeCache(cache: ProfileCache): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(PROFILE_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

export async function buildAuthorProfile(
    authorId: string,
    options: BuildAuthorProfileOptions = {},
): Promise<AuthorProfile> {
    if (!options.forceRefresh) {
        const inFlight = inFlightProfiles.get(authorId);
        if (inFlight) {
            return inFlight;
        }
    }

    const task = buildAuthorProfileInternal(authorId, options);
    if (!options.forceRefresh) {
        inFlightProfiles.set(authorId, task);
    }

    try {
        return await task;
    } finally {
        if (!options.forceRefresh) {
            inFlightProfiles.delete(authorId);
        }
    }
}

async function buildAuthorProfileInternal(
    authorId: string,
    options: BuildAuthorProfileOptions,
): Promise<AuthorProfile> {
    const paperLimit = options.paperLimit ?? 200;
    const topPaperLimit = options.topPapers ?? 10;
    const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

    const cache = await readCache();
    const cached = cache[authorId];
    if (!options.forceRefresh && cached) {
        const age = Date.now() - Date.parse(cached.updatedAt);
        if (Number.isFinite(age) && age >= 0 && age < cacheTtlMs) {
            return cached.profile;
        }
    }

    const detail = await getAuthor(authorId);
    const papersResponse = await getAuthorPapers(authorId, {
        limit: paperLimit,
        sort: "citationCount:desc",
    });
    const papers = papersResponse.data ?? detail.papers ?? [];

    const topPapers = [...papers]
        .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0))
        .slice(0, topPaperLimit)
        .map(toCorePaper);

    const coauthors = aggregateCoauthorsFromPapers(authorId, papers);

    const baseAffiliations = toAffiliations(detail.affiliations);

    let openAlexAffiliations: Affiliation[] = [];
    const topicTimeline = buildTopicTimelineFromPapers(papers);

    try {
        const openAlexId = await resolveOpenAlexAuthorId({
            name: detail.name,
            affiliation: detail.affiliations?.[0],
            orcid: detail.externalIds?.ORCID,
        });

        if (openAlexId) {
            const openAlex = await getOpenAlexAuthor(openAlexId);
            openAlexAffiliations = (openAlex.affiliations ?? [])
                .flatMap((a) => (a.years?.length
                    ? a.years.map((year) => ({ name: a.institution.display_name, year }))
                    : [{ name: a.institution.display_name }]))
                .filter((v) => !!v.name);

            // Keep timeline derived from paper-level fields to avoid misleading
            // per-year duplication from OpenAlex lifetime aggregate concepts.
        }
    } catch {
        // OpenAlex enrichment is best-effort.
    }

    const profile: AuthorProfile = {
        id: detail.authorId ?? authorId,
        name: detail.name,
        aliases: detail.aliases,
        affiliations: mergeAffiliations(baseAffiliations, openAlexAffiliations),
        homepage: detail.homepage,
        hIndex: detail.hIndex ?? 0,
        citationCount: detail.citationCount ?? 0,
        paperCount: detail.paperCount ?? papers.length,
        influentialCitationCount: detail.influentialCitationCount ?? 0,
        topPapers,
        coauthors,
        topicTimeline,
    };

    cache[authorId] = {
        updatedAt: new Date().toISOString(),
        profile,
    };
    await writeCache(cache);

    return profile;
}
