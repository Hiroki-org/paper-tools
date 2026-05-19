import {
	type CoauthorInfo,
	getAuthorPapers,
	type S2Paper,
} from "@paper-tools/core";

interface BuildCoauthorNetworkOptions {
	limit?: number;
	sort?: string;
}

export function aggregateCoauthorsFromPapers(
	authorId: string,
	papers: S2Paper[],
): CoauthorInfo[] {
	const authorMap = new Map<string, CoauthorInfo>();
	const seenInPaper = new Set<string>();
	const normalizedAuthorId = authorId.trim();

	for (const paper of papers) {
		seenInPaper.clear();
		for (const author of paper.authors ?? []) {
			const id = (author.authorId ?? "").trim();
			if (!id || id === normalizedAuthorId || seenInPaper.has(id)) {
				continue;
			}
			seenInPaper.add(id);

			const prev = authorMap.get(id);
			if (prev) {
				prev.paperCount += 1;
			} else {
				const name = (author.name ?? "Unknown").trim() || "Unknown";
				authorMap.set(id, { authorId: id, name, paperCount: 1 });
			}
		}
	}

	return [...authorMap.values()].sort((a, b) => b.paperCount - a.paperCount);
}

export async function buildCoauthorNetwork(
	authorId: string,
	options: BuildCoauthorNetworkOptions = {},
): Promise<CoauthorInfo[]> {
	const papers = await getAuthorPapers(authorId, {
		limit: options.limit ?? 200,
		sort: options.sort,
	});
	return aggregateCoauthorsFromPapers(authorId, papers.data ?? []);
}
