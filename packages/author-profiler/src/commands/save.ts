import { outputJson } from "@paper-tools/core";
import { saveAuthorProfileToNotion } from "../notion/author-client.js";
import { resolveAuthorId } from "../services/author-resolver.js";
import { buildAuthorProfile } from "../services/profile-builder.js";

interface SaveOptions {
	id?: boolean;
	dryRun?: boolean;
}

export async function runSaveCommand(
	nameOrId: string,
	options: SaveOptions,
): Promise<void> {
	const resolved = await resolveAuthorId(nameOrId, { id: options.id });
	const profile = await buildAuthorProfile(resolved.authorId);

	const result = await saveAuthorProfileToNotion(profile, {
		dryRun: options.dryRun ?? false,
	});

	if (result.action === "dry-run") {
		await outputJson({ action: "dry-run", profile });
		return;
	}

	await outputJson(result);
}
