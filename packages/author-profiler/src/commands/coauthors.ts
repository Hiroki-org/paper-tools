import { resolveAuthorId } from "../services/author-resolver.js";
import { buildCoauthorNetwork } from "../services/coauthor-network.js";

interface CoauthorOptions {
    id?: boolean;
    depth?: string;
}

export async function runCoauthorsCommand(nameOrId: string, options: CoauthorOptions): Promise<void> {
    const depth = Number.parseInt(options.depth ?? "1", 10);
    if (!Number.isFinite(depth) || depth !== 1) {
        throw new Error("現在 --depth は 1 のみ対応しています");
    }

    const resolved = await resolveAuthorId(nameOrId, { id: options.id });
    const coauthors = await buildCoauthorNetwork(resolved.authorId, { limit: 200, sort: "citationCount:desc" });

    console.table(
        coauthors.map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            authorId: entry.authorId,
            paperCount: entry.paperCount,
        })),
    );
}
