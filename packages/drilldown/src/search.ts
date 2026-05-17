import { extractKeywords } from "./drilldown.js";
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
export async function enrichAllWithCrossref(
    papers: Paper[],
    concurrency = 3,
): Promise<Paper[]> {
    if (papers.length === 0) {
        return [];
    }

    const workerCount = Math.max(1, Math.min(papers.length, Math.floor(concurrency)));
    const enrichedPapers = [...papers];
    let cursor = 0;

    const workers = Array.from({ length: workerCount }, () => (async () => {
        while (true) {
            const current = cursor;
            cursor += 1;
            if (current >= papers.length) {
                return;
            }

            enrichedPapers[current] = await enrichWithCrossref(papers[current]);
        }
    })());

    await Promise.all(workers);
    return enrichedPapers;
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

/**
 * drilldown 結果の型
 */
export interface DrilldownResult {
    /** 探索の深さレベル (0 = seed) */
    level: number;
    /** この深さで見つかった論文 */
    papers: Paper[];
}

/**
 * シード論文群から再帰的にキーワード抽出 → 検索を繰り返して深掘りする
 * @param seedPapers - 初期論文リスト
 * @param depth - 深掘りの最大深さ（デフォルト 1）
 * @param maxPerLevel - 各レベルで取得する最大論文数（デフォルト 10）
 * @param enrich - Crossref で情報を補完するか（デフォルト false）
 */
export async function drilldown(
    seedPapers: Paper[],
    depth = 1,
    maxPerLevel = 10,
    enrich = false,
): Promise<DrilldownResult[]> {
    const results: DrilldownResult[] = [{ level: 0, papers: seedPapers }];
    const seenDois = new Set<string>();
    const seenTitles = new Set<string>();

    // seed の DOI と title を記録
    for (const p of seedPapers) {
        if (p.doi) seenDois.add(p.doi.toLowerCase());
        if (p.title) {
            const normalizedTitle = p.title.toLowerCase().trim().replace(/\s+/g, " ");
            seenTitles.add(normalizedTitle);
        }
    }

    let currentPapers = seedPapers;
    const enrichPromises: Promise<void>[] = [];

    for (let d = 1; d <= depth; d++) {
        const keywords = extractKeywords(currentPapers, 5);
        if (keywords.length === 0) break;

        const query = keywords.join(" ");
        let found = await searchByKeyword(query, maxPerLevel * 2);

        // 既出 DOI / title を除外
        found = found.filter((p) => {
            if (p.doi) {
                const lower = p.doi.toLowerCase();
                if (seenDois.has(lower)) return false;
                seenDois.add(lower);
            } else if (p.title) {
                const normalizedTitle = p.title.toLowerCase().trim().replace(/\s+/g, " ");
                if (seenTitles.has(normalizedTitle)) return false;
                seenTitles.add(normalizedTitle);
            }
            return true;
        });

        found = found.slice(0, maxPerLevel);

        if (found.length === 0) break;

        const resultEntry: DrilldownResult = { level: d, papers: found };
        results.push(resultEntry);

        if (enrich) {
            // Background enrichment allows parallel fetch
            enrichPromises.push(
                enrichAllWithCrossref(found)
                    .then((enriched) => {
                        resultEntry.papers = enriched;
                    })
                    .catch((error) => {
                        const message = error instanceof Error ? error.message : String(error);
                        console.error(`[drilldown] Enrichment failed at level ${d}: ${message}`);
                    })
            );
        }
        currentPapers = found;
    }

    if (enrichPromises.length > 0) {
        await Promise.all(enrichPromises);
    }

    return results;
}
