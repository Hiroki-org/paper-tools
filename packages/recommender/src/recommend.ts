import {
    getPaper,
    getRecommendations,
    getRecommendationsForPaper,
    searchPapers,
    type S2Paper,
} from "@paper-tools/core";

export interface RecommendOptions {
    limit?: number;
    from?: "recent" | "all-cs";
}

function looksLikeDoi(identifier: string): boolean {
    return /^10\.[^/]+\/.+/i.test(identifier);
}

function isLikelyTitle(identifier: string): boolean {
    return identifier.includes(" ") || identifier.startsWith("title:");
}

export async function resolveToS2Id(identifier: string): Promise<string> {
    const value = identifier.trim();
    if (!value) {
        throw new Error("identifier が空です");
    }

    if (value.startsWith("DOI:")) {
        const paper = await getPaper(value);
        return paper.paperId;
    }

    if (looksLikeDoi(value)) {
        const paper = await getPaper(`DOI:${value}`);
        return paper.paperId;
    }

    if (value.startsWith("title:") || isLikelyTitle(value)) {
        const query = value.startsWith("title:") ? value.slice("title:".length) : value;
        const response = await searchPapers(query);
        const first = response.data?.[0];
        if (!first?.paperId) {
            throw new Error(`タイトルから論文を解決できませんでした: ${query}`);
        }
        return first.paperId;
    }

    return value;
}

export async function recommendFromSingle(
    paperId: string,
    options: RecommendOptions = {},
): Promise<S2Paper[]> {
    const resolvedId = await resolveToS2Id(paperId);
    const response = await getRecommendationsForPaper(resolvedId, {
        limit: options.limit ?? 10,
        from: options.from ?? "recent",
    });
    return response.recommendedPapers ?? [];
}

export async function recommendFromMultiple(
    positiveIds: string[],
    negativeIds: string[] = [],
    options: Omit<RecommendOptions, "from"> = {},
): Promise<S2Paper[]> {
    if (positiveIds.length === 0) {
        return [];
    }

    const CONCURRENCY = 10;
    async function processPool(ids: string[]): Promise<PromiseSettledResult<string>[]> {
        const results = new Array<PromiseSettledResult<string>>(ids.length);
        let cursor = 0;
        const worker = async () => {
            while (cursor < ids.length) {
                const index = cursor++;
                try {
                    const value = await resolveToS2Id(ids[index]);
                    results[index] = { status: "fulfilled", value };
                } catch (reason) {
                    results[index] = { status: "rejected", reason };
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
        return results;
    }

    const [positiveSettled, negativeSettled] = await Promise.all([
        processPool(positiveIds),
        processPool(negativeIds),
    ]);

    const resolvedPositive = positiveSettled
        .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
        .map((result) => result.value);
    const resolvedNegative = negativeSettled
        .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
        .map((result) => result.value);

    if (resolvedPositive.length === 0) {
        return [];
    }

    const response = await getRecommendations(resolvedPositive, resolvedNegative, {
        limit: options.limit ?? 20,
    });
    return response.recommendedPapers ?? [];
}