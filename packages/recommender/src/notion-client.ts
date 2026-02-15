import { Client } from "@notionhq/client";
import type { S2Paper } from "@paper-tools/core";

export interface NotionPaperRecord {
    pageId: string;
    title: string;
    doi?: string;
    semanticScholarId?: string;
}

type NotionPropertyType =
    | "title"
    | "rich_text"
    | "number"
    | "multi_select"
    | "select"
    | "url";

interface PropertySpec {
    type: NotionPropertyType;
    required: boolean;
}

const PROPERTY_SPECS: Record<string, PropertySpec> = {
    "タイトル": { type: "title", required: true },
    "DOI": { type: "rich_text", required: true },
    "著者": { type: "rich_text", required: false },
    "年": { type: "number", required: false },
    "会議/ジャーナル": { type: "rich_text", required: false },
    "被引用数": { type: "number", required: false },
    "分野": { type: "multi_select", required: false },
    "ソース": { type: "select", required: false },
    "Open Access PDF": { type: "url", required: false },
    "Semantic Scholar ID": { type: "rich_text", required: false },
    "要約": { type: "rich_text", required: false },
};

function createNotionClient(): Client {
    const apiKey = process.env["NOTION_API_KEY"];
    if (!apiKey) {
        throw new Error("NOTION_API_KEY が未設定です");
    }
    return new Client({ auth: apiKey });
}

type NotionDatabase = {
    properties: Record<string, { type: string }>;
};

export interface DatabaseValidationResult {
    properties: Record<string, { type: string }>;
    missingOptional: string[];
}

export async function getDatabase(
    databaseId: string,
    client: Client = createNotionClient(),
): Promise<DatabaseValidationResult> {
    const database = await client.databases.retrieve({ database_id: databaseId }) as unknown as NotionDatabase;
    const properties = database.properties ?? {};

    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    for (const [name, spec] of Object.entries(PROPERTY_SPECS)) {
        const actual = properties[name];
        if (!actual) {
            if (spec.required) {
                missingRequired.push(name);
            } else {
                missingOptional.push(name);
            }
            continue;
        }
        if (actual.type !== spec.type) {
            throw new Error(`Notion DBプロパティ型が不正です: ${name} expected=${spec.type} actual=${actual.type}`);
        }
    }

    if (missingRequired.length > 0) {
        throw new Error(`必須プロパティが不足しています: ${missingRequired.join(", ")}`);
    }

    return {
        properties,
        missingOptional,
    };
}

type NotionPage = {
    id: string;
    properties: Record<string, any>;
};

function readTitle(page: NotionPage): string {
    const prop = page.properties["タイトル"];
    if (!prop || prop.type !== "title") {
        return "";
    }
    const text = (prop.title ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
    return text;
}

function readRichText(page: NotionPage, propertyName: string): string {
    const prop = page.properties[propertyName];
    if (!prop || prop.type !== "rich_text") {
        return "";
    }
    return (prop.rich_text ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
}

export async function queryPapers(
    databaseId: string,
    client: Client = createNotionClient(),
): Promise<NotionPaperRecord[]> {
    const papers: NotionPaperRecord[] = [];
    let cursor: string | undefined;

    do {
        const response = await client.databases.query({
            database_id: databaseId,
            start_cursor: cursor,
            page_size: 100,
        });

        for (const row of response.results as unknown as NotionPage[]) {
            papers.push({
                pageId: row.id,
                title: readTitle(row),
                doi: readRichText(row, "DOI") || undefined,
                semanticScholarId: readRichText(row, "Semantic Scholar ID") || undefined,
            });
        }

        cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return papers;
}

function richText(content: string) {
    return [{ text: { content } }];
}

export async function createPaperPage(
    databaseId: string,
    paper: S2Paper,
    client: Client = createNotionClient(),
): Promise<void> {
    const { properties, missingOptional } = await getDatabase(databaseId, client);

    const has = (name: string) => !!properties[name] && !missingOptional.includes(name);
    const authors = (paper.authors ?? []).map((a) => a.name).join(", ");
    const doi = paper.externalIds?.DOI ?? "";
    const fieldsOfStudy = paper.fieldsOfStudy ?? [];

    const notionProperties: Record<string, unknown> = {
        "タイトル": {
            title: [{ text: { content: paper.title || "(untitled)" } }],
        },
        "DOI": {
            rich_text: richText(doi),
        },
    };

    if (has("著者") && authors) {
        notionProperties["著者"] = { rich_text: richText(authors) };
    }
    if (has("年") && typeof paper.year === "number") {
        notionProperties["年"] = { number: paper.year };
    }
    if (has("会議/ジャーナル") && paper.venue) {
        notionProperties["会議/ジャーナル"] = { rich_text: richText(paper.venue) };
    }
    if (has("被引用数") && typeof paper.citationCount === "number") {
        notionProperties["被引用数"] = { number: paper.citationCount };
    }
    if (has("分野") && fieldsOfStudy.length > 0) {
        notionProperties["分野"] = {
            multi_select: fieldsOfStudy.map((name) => ({ name })),
        };
    }
    if (has("ソース")) {
        notionProperties["ソース"] = { select: { name: "recommendation" } };
    }
    if (has("Open Access PDF") && paper.openAccessPdf?.url) {
        notionProperties["Open Access PDF"] = { url: paper.openAccessPdf.url };
    }
    if (has("Semantic Scholar ID") && paper.paperId) {
        notionProperties["Semantic Scholar ID"] = { rich_text: richText(paper.paperId) };
    }
    if (has("要約") && paper.abstract) {
        notionProperties["要約"] = { rich_text: richText(paper.abstract) };
    }

    await client.pages.create({
        parent: { database_id: databaseId },
        properties: notionProperties as any,
    });
}

export interface DuplicateResult {
    duplicateDois: Set<string>;
    duplicateTitles: Set<string>;
}

export async function findDuplicates(
    databaseId: string,
    papers: S2Paper[],
    client: Client = createNotionClient(),
): Promise<DuplicateResult> {
    const duplicateDois = new Set<string>();
    const duplicateTitles = new Set<string>();

    const existing = await queryPapers(databaseId, client);
    const existingTitles = new Set(existing.map((p) => p.title.trim().toLowerCase()).filter(Boolean));

    for (const paper of papers) {
        const doi = paper.externalIds?.DOI;
        if (doi) {
            const doiQuery = await client.databases.query({
                database_id: databaseId,
                filter: {
                    property: "DOI",
                    rich_text: {
                        equals: doi,
                    },
                } as any,
                page_size: 1,
            });
            if (doiQuery.results.length > 0) {
                duplicateDois.add(doi);
            }
        }

        const key = (paper.title ?? "").trim().toLowerCase();
        if (key && existingTitles.has(key)) {
            duplicateTitles.add(key);
        }
    }

    return { duplicateDois, duplicateTitles };
}