import { buildAuthorProfile } from "../services/profile-builder.js";
import { resolveAuthorId } from "../services/author-resolver.js";

interface ProfileOptions {
    id?: boolean;
    json?: boolean;
}

export async function runProfileCommand(nameOrId: string, options: ProfileOptions): Promise<void> {
    const resolved = await resolveAuthorId(nameOrId, { id: options.id });
    const profile = await buildAuthorProfile(resolved.authorId);

    if (options.json) {
        console.log(JSON.stringify(profile, null, 2));
        return;
    }

    console.log(`\nAuthor: ${profile.name} (${profile.id})`);
    console.table([
        { metric: "h-index", value: profile.hIndex },
        { metric: "citationCount", value: profile.citationCount },
        { metric: "paperCount", value: profile.paperCount },
        { metric: "influentialCitationCount", value: profile.influentialCitationCount },
        { metric: "homepage", value: profile.homepage ?? "-" },
        { metric: "affiliations", value: profile.affiliations.map((v) => v.name).join(", ") || "-" },
    ]);
}
