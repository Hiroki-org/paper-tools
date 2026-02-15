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
    const papers = await searchVenuePublications(
        venueName,
        conference.year,
        maxResults,
    );

    return {
        ...conference,
        acceptedPapers: papers,
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
