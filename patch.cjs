const fs = require('fs');
const filePath = 'packages/author-profiler/src/notion/author-client.ts';
let code = fs.readFileSync(filePath, 'utf8');

const typeDef = `export type NotionProperties = Record<string,
    | { title: { text: { content: string } }[] }
    | { rich_text: { text: { content: string } }[] }
    | { number: number | undefined }
    | { url: string | null }
    | { date: { start: string } | null }
>;

export interface SaveAuthorProfileResult {`;

code = code.replace(
    'export interface SaveAuthorProfileResult {',
    typeDef
);

code = code.replace(
    /const properties: Record<string, unknown> = \{[\s\S]*?    \};/,
    `    const properties = {
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
    } satisfies NotionProperties;`
);

code = code.replace(
    'properties: properties as any',
    'properties: properties as unknown as Parameters<typeof client.pages.update>[0]["properties"]'
);
code = code.replace(
    'properties: properties as any',
    'properties: properties as unknown as Parameters<typeof client.pages.create>[0]["properties"]'
);

fs.writeFileSync(filePath, code);
