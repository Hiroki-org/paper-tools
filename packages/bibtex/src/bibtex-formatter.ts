import { generateBibtexKey } from "./bibtex-key.js";
import type { BibtexFormat, BibtexKeyFormat, FormatResult, ParsedBibtexEntry } from "./types.js";

function normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
}

function stripWrapping(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed.slice(1, -1).trim();
    }
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

function splitAuthors(authorField: string): string[] {
    return authorField
        .split(/\s+and\s+/i)
        .map((author) => author.trim())
        .filter(Boolean);
}

function normalizeAuthor(author: string): string {
    const cleaned = normalizeWhitespace(author);
    if (!cleaned) return cleaned;

    if (cleaned.includes(",")) {
        const [last, first] = cleaned.split(",", 2);
        return `${normalizeWhitespace(last)}${first ? `, ${normalizeWhitespace(first)}` : ""}`;
    }

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return cleaned;
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(" ");
    return `${last}, ${first}`;
}

function escapeFieldValue(value: string): string {
    return value.replace(/\n+/g, " ").trim();
}

export function parseBibtexEntry(raw: string): ParsedBibtexEntry {
    const text = raw.trim();
    const headerMatch = text.match(/^@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*)\}$/);
    if (!headerMatch) {
        throw new Error("Invalid BibTeX entry format");
    }

    const entryType = (headerMatch[1] ?? "article").toLowerCase();
    const key = (headerMatch[2] ?? "").trim();
    const body = (headerMatch[3] ?? "").trim();

    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"(?:\\.|[^"])*"|[^,\n]+)\s*,?/g;

    let match: RegExpExecArray | null;
    while ((match = fieldRegex.exec(body)) !== null) {
        const name = (match[1] ?? "").toLowerCase();
        const value = stripWrapping(match[2] ?? "");
        if (name) {
            fields[name] = value;
        }
    }

    return { entryType, key, fields };
}

export function splitBibtexEntries(input: string): string[] {
    const entries: string[] = [];
    let i = 0;

    while (i < input.length) {
        const start = input.indexOf("@", i);
        if (start === -1) break;

        const braceStart = input.indexOf("{", start);
        if (braceStart === -1) break;

        let depth = 0;
        let end = -1;
        for (let j = braceStart; j < input.length; j++) {
            const ch = input[j];
            if (ch === "{") depth++;
            if (ch === "}") depth--;
            if (depth === 0) {
                end = j;
                break;
            }
        }

        if (end === -1) break;
        entries.push(input.slice(start, end + 1).trim());
        i = end + 1;
    }

    return entries;
}

function orderedFields(fields: Record<string, string>): string[] {
    const priority = ["author", "title", "journal", "booktitle", "year", "doi", "url"];
    const ordered = priority.filter((name) => fields[name]);
    const rest = Object.keys(fields)
        .filter((name) => !priority.includes(name))
        .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
}

export function formatBibtex(
    raw: string,
    options?: { key?: string; format?: BibtexFormat; keyFormat?: BibtexKeyFormat },
): FormatResult {
    const parsed = parseBibtexEntry(raw);
    const warnings: string[] = [];

    const authors = splitAuthors(parsed.fields.author ?? "").map(normalizeAuthor).filter(Boolean);
    const title = normalizeWhitespace(parsed.fields.title ?? "");
    const yearString = (parsed.fields.year ?? "").match(/\d{4}/)?.[0] ?? "0";
    const year = Number.parseInt(yearString, 10);

    if (!parsed.fields.author) warnings.push("Missing required field: author");
    if (!parsed.fields.title) warnings.push("Missing required field: title");
    if (!parsed.fields.year) warnings.push("Missing required field: year");
    if (!parsed.fields.booktitle && !parsed.fields.journal) {
        warnings.push("Missing required field: booktitle or journal");
    }

    const generatedKey = generateBibtexKey(
        {
            authors,
            year: Number.isFinite(year) ? year : 0,
            title,
            venue: parsed.fields.booktitle ?? parsed.fields.journal,
        },
        options?.keyFormat ?? "default",
    );

    const key = options?.key ?? generatedKey;

    const normalizedFields: Record<string, string> = { ...parsed.fields };
    if (authors.length > 0) {
        normalizedFields.author = authors.join(" and ");
    }
    if (title) {
        normalizedFields.title = title;
    }
    if (Number.isFinite(year) && year > 0) {
        normalizedFields.year = String(year);
    }

    const formatType = options?.format ?? "bibtex";
    const entryType = formatType === "biblatex" && parsed.entryType === "conference"
        ? "inproceedings"
        : parsed.entryType;

    const lines = [`@${entryType}{${key},`];
    for (const fieldName of orderedFields(normalizedFields)) {
        lines.push(`  ${fieldName} = {${escapeFieldValue(normalizedFields[fieldName] ?? "")}},`);
    }
    if (lines.length > 1) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = last.replace(/,$/, "");
    }
    lines.push("}");

    return {
        formatted: lines.join("\n"),
        warnings,
    };
}
