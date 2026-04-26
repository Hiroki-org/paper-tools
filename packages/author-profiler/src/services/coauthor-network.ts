import type { CoauthorInfo, S2Paper } from "@paper-tools/core";

export function aggregateCoauthorsFromPapers(authorId: string, papers: S2Paper[]): CoauthorInfo[] {
    const authorMap = new Map<string, CoauthorInfo>();

    for (const paper of papers) {
        const seenInPaper = new Set<string>();
        for (const author of paper.authors ?? []) {
            const id = (author.authorId ?? "").trim();
            const name = (author.name ?? "Unknown").trim() || "Unknown";
            if (!id || id === authorId || seenInPaper.has(id)) {
                continue;
            }
            seenInPaper.add(id);

            const prev = authorMap.get(id);
            if (prev) {
                prev.paperCount += 1;
            } else {
                authorMap.set(id, { authorId: id, name, paperCount: 1 });
            }
        }
    }

    return [...authorMap.values()].sort((a, b) => b.paperCount - a.paperCount);
}

