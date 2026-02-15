import type { Conference, Paper } from "@paper-tools/core";
import { searchVenuePublications } from "@paper-tools/core";

/**
 * DBLP からカンファレンスの論文情報を取得し、
 * スクレイピングで取得した Conference オブジェクトに統合する
 */
export async function enrichWithDblp(
    conference: Conference,
    venueName: string,
    maxResults = 100,
): Promise<Conference> {
    const papersFromDblp = await searchVenuePublications(
        venueName,
        conference.year,
        maxResults,
    );

    const existing = conference.acceptedPapers ?? [];
    const mergedMap = new Map<string, Paper>();

    for (const paper of existing) {
        const key = paper.doi ?? paper.title.toLowerCase();
        mergedMap.set(key, paper);
    }
    for (const paper of papersFromDblp) {
        const key = paper.doi ?? paper.title.toLowerCase();
        const current = mergedMap.get(key);
        mergedMap.set(key, current ? { ...current, ...paper } : paper);
    }

    return {
        ...conference,
        acceptedPapers: Array.from(mergedMap.values()),
    };
}

/**
 * DBLP からベニュー名で論文を検索する
 */
export async function searchConferencePapers(
    venueName: string,
    year?: number,
    maxResults = 100,
): Promise<Paper[]> {
    return searchVenuePublications(venueName, year, maxResults);
}
