import type { Paper } from "@paper-tools/core";
import {
    searchPublications,
    searchVenuePublications,
    getWorkByDoi,
    searchWorks,
} from "@paper-tools/core";

/**
 * DBLP でキーワード検索し、結果を返す
 */
export async function searchByKeyword(
    keyword: string,
    maxResults = 30,
): Promise<Paper[]> {
    return searchPublications(keyword, maxResults);
}

/**
 * DBLP で会議名（＋年）で検索する
 */
export async function searchByVenue(
    venue: string,
    year?: number,
    maxResults = 100,
): Promise<Paper[]> {
    return searchVenuePublications(venue, year, maxResults);
}

/**
 * Paper に DOI がある場合、Crossref メタデータで情報を補完する
 * - abstract, keywords, citationCount, referenceCount 等
 */
export async function enrichWithCrossref(paper: Paper): Promise<Paper> {
    if (!paper.doi) {
        return paper;
    }

    const crossrefPaper = await getWorkByDoi(paper.doi);
    if (!crossrefPaper) {
        return paper;
    }

    return {
        ...paper,
        abstract: paper.abstract ?? crossrefPaper.abstract,
        keywords: paper.keywords ?? crossrefPaper.keywords,
        citationCount: paper.citationCount ?? crossrefPaper.citationCount,
        referenceCount: paper.referenceCount ?? crossrefPaper.referenceCount,
        volume: paper.volume ?? crossrefPaper.volume,
        issue: paper.issue ?? crossrefPaper.issue,
        pages: paper.pages ?? crossrefPaper.pages,
    };
}

/**
 * 複数論文を一括で Crossref 情報で補完する（最大 concurrency 数で並列化）
 */
export async function enrichAllWithCrossref(papers: Paper[], _concurrency?: number): Promise<Paper[]> {
    // core 側の RateLimiter がよしなにリクエストを制御するため、手動バッチは不要
    return Promise.all(papers.map((p) => enrichWithCrossref(p)));
}

/**
 * Crossref でキーワード検索する
 */
export async function searchCrossref(
    query: string,
    maxResults = 20,
): Promise<Paper[]> {
    return searchWorks(query, maxResults);
}
