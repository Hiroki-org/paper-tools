import type { Paper } from "@paper-tools/core";
import { searchByKeyword, enrichAllWithCrossref } from "./search.js";

/**
 * 英語ストップワード一覧（キーワード抽出で除外する）
 */
const STOP_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "must",
    "not", "no", "nor", "so", "if", "then", "than", "that", "this",
    "these", "those", "it", "its", "he", "she", "we", "they", "them",
    "their", "his", "her", "our", "my", "your", "which", "what", "who",
    "whom", "where", "when", "how", "all", "each", "every", "both",
    "few", "more", "most", "some", "any", "such", "only", "own", "same",
    "also", "just", "about", "above", "after", "again", "against",
    "before", "below", "between", "during", "into", "through", "under",
    "until", "up", "down", "out", "off", "over", "very", "too", "much",
    "many", "here", "there", "other", "using", "used", "based", "via",
    "however", "while", "among", "within", "without", "towards",
    "new", "well", "still", "even", "being", "because", "since",
    "given", "per", "two", "three", "one", "first", "second",
    "et", "al", "ie", "eg", "etc", "vs", "de", "le", "la",
    "show", "shows", "shown", "paper", "papers", "method", "methods",
    "approach", "approaches", "propose", "proposed", "results", "result",
    "work", "works", "study", "studies", "use", "provide", "provides",
    "present", "presents", "several", "different", "various",
]);

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

        if (enrich) {
            found = await enrichAllWithCrossref(found);
        }

        if (found.length === 0) break;

        results.push({ level: d, papers: found });
        currentPapers = found;
    }

    return results;
}

/**
 * 論文群のタイトル・キーワードからキーワードを抽出し、出現頻度順に返す
 * @param papers - 論文リスト
 * @param topN - 返すキーワード数（デフォルト 10）
 */
export function extractKeywords(papers: Paper[], topN = 10): string[] {
    const freq = new Map<string, number>();

    for (const paper of papers) {
        // タイトルからトークン抽出
        const titleTokens = tokenize(paper.title);
        for (const token of titleTokens) {
            freq.set(token, (freq.get(token) ?? 0) + 1);
        }

        // 既存キーワード（tokenize適用）
        if (paper.keywords) {
            for (const kw of paper.keywords) {
                const tokens = tokenize(kw);
                for (const token of tokens) {
                    freq.set(token, (freq.get(token) ?? 0) + 2);
                }
            }
        }

        // abstract からもトークン抽出
        if (paper.abstract) {
            const abstractTokens = tokenize(paper.abstract);
            for (const token of abstractTokens) {
                freq.set(token, (freq.get(token) ?? 0) + 1);
            }
        }
    }

    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word]) => word);
}

/**
 * テキストをトークン化し、ストップワードを除去する
 * 小文字に変換し、英数字とハイフン以外を削除してトークンに分割し、
 * STOP_WORDS に含まれるか 2 文字以下のトークンを除外する
 * @param text - トークン化対象のテキスト
 * @returns ストップワードが除去されたトークン配列
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}
