import { Client } from "@notionhq/client";
import type { AuthorProfile } from "@paper-tools/core";

export interface SaveAuthorProfileOptions {
    databaseId?: string;
    dryRun?: boolean;
}

export interface SaveAuthorProfileResult {
    action: "created" | "updated" | "dry-run";
    pageId?: string;
}

function createClient(): Client {
    const apiKey = process.env["NOTION_API_KEY"];
    if (!apiKey) {
        throw new Error("NOTION_API_KEY が未設定です");
    }
    return new Client({ auth: apiKey });
}

function titleRichText(text: string) {
    return [{ text: { content: text } }];
}

function richText(text: string) {
    return [{ text: { content: text } }];
}

function formatAffiliations(profile: AuthorProfile): string {
    return profile.affiliations
        .map((v) => (v.year ? `${v.name} (${v.year})` : v.name))
        .join(", ");
}

export async function findExistingAuthorPage(
    profile: AuthorProfile,
    databaseId: string,
    client: Client = createClient(),
): Promise<string | null> {
    const byId = await client.databases.query({
        database_id: databaseId,
        filter: {
            property: "Semantic Scholar ID",
            rich_text: { equals: profile.id },
        },
        page_size: 1,
    });

    if (byId.results.length > 0) {
        return byId.results[0]?.id ?? null;
    }

    const byName = await client.databases.query({
        database_id: databaseId,
        filter: {
            property: "Name",
            title: { equals: profile.name },
        },
        page_size: 1,
    });

    return byName.results[0]?.id ?? null;
}

export async function saveAuthorProfileToNotion(
    profile: AuthorProfile,
    options: SaveAuthorProfileOptions = {},
    client: Client = createClient(),
): Promise<SaveAuthorProfileResult> {
    const databaseId = options.databaseId ?? process.env["NOTION_AUTHOR_DATABASE_ID"];
    if (!databaseId) {
        throw new Error("NOTION_AUTHOR_DATABASE_ID が未設定です");
    }

    type PageProperties = Parameters<Client["pages"]["create"]>[0]["properties"];

    const properties: PageProperties = {
        "Name": {
            title: titleRichText(profile.name),
        },
        "Semantic Scholar ID": {
            rich_text: richText(profile.id),
        },
        "H-Index": {
            number: profile.hIndex,
        },
        "Citation Count": {
            number: profile.citationCount,
        },
        "Paper Count": {
            number: profile.paperCount,
        },
        "Affiliations": {
            rich_text: richText(formatAffiliations(profile)),
        },
        "Homepage": {
            url: profile.homepage ?? null,
        },
        "Last Updated": {
            date: { start: new Date().toISOString().slice(0, 10) },
        },
    };

    if (options.dryRun) {
        return { action: "dry-run" };
    }

    const existingPageId = await findExistingAuthorPage(profile, databaseId, client);
    if (existingPageId) {
        await client.pages.update({ page_id: existingPageId, properties });
        return {
            action: "updated",
            pageId: existingPageId,
        };
    }

    const created = await client.pages.create({
        parent: { database_id: databaseId },
        properties,
    });

    return {
        action: "created",
        pageId: created.id,
    };
}
