const fs = require('fs');
let code = fs.readFileSync('packages/recommender/src/notion-client.ts', 'utf8');

const helperFunc = `
function extractPlainText(items: unknown): string {
    if (!Array.isArray(items)) {
        return "";
    }
    return items
        .filter((t): t is NotionRichTextItem => typeof t === "object" && t !== null && "plain_text" in t)
        .map((t) => typeof t.plain_text === "string" ? t.plain_text : "")
        .join("")
        .trim();
}
`;

// Insert helper func before getDatabaseInfo
code = code.replace(/export async function getDatabaseInfo/g, helperFunc.trim() + "\n\nexport async function getDatabaseInfo");

code = code.replace(
    /const databaseName = \(database\?\.title \?\? \[\]\)\n        \.map\(\(t: NotionRichTextItem\) => t\?\.plain_text \?\? ""\)\n        \.join\(""\)\n        \.trim\(\) \|\| "\(untitled database\)";/g,
    'const databaseName = extractPlainText(database?.title) || "(untitled database)";'
);

code = code.replace(
    /const text = \(prop\.title \?\? \[\]\)\.map\(\(t: NotionRichTextItem\) => t\?\.plain_text \?\? ""\)\.join\(""\)\.trim\(\);/g,
    'const text = extractPlainText(prop.title);'
);

code = code.replace(
    /return \(prop\.rich_text \?\? \[\]\)\.map\(\(t: NotionRichTextItem\) => t\?\.plain_text \?\? ""\)\.join\(""\)\.trim\(\);/g,
    'return extractPlainText(prop.rich_text);'
);

fs.writeFileSync('packages/recommender/src/notion-client.ts', code);
