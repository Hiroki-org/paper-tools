import { defaultLogger, type Logger } from "../logger.js";
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
	logger: Logger = defaultLogger,
): Promise<void> {
	const resolved = await resolveAuthorId(nameOrId, { id: options.id });
	const profile = await buildAuthorProfile(resolved.authorId);

	const result = await saveAuthorProfileToNotion(profile, {
		dryRun: options.dryRun ?? false,
	});

	if (result.action === "dry-run") {
		logger.log(`${JSON.stringify({ action: "dry-run", profile }, null, 2)}\n`);
		return;
	}

	logger.log(`${JSON.stringify(result, null, 2)}\n`);
}
