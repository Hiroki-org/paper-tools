import { buildAuthorProfile } from "../services/profile-builder.js";
import { resolveAuthorId } from "../services/author-resolver.js";

interface PapersOptions {
    id?: boolean;
    top?: string;
}

function parseTop(value?: string): number {
    if (!value) return 10;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--top には正の整数を指定してください: ${value}`);
    }
    return parsed;
}

export async function runPapersCommand(nameOrId: string, options: PapersOptions): Promise<void> {
    const top = parseTop(options.top);
    const resolved = await resolveAuthorId(nameOrId, { id: options.id });
    const profile = await buildAuthorProfile(resolved.authorId, { topPapers: top });

    console.table(
        profile.topPapers.slice(0, top).map((paper, index) => ({
            rank: index + 1,
            title: paper.title,
            year: paper.year ?? "-",
            citationCount: paper.citationCount ?? 0,
            venue: paper.venue ?? "-",
        })),
    );
}
