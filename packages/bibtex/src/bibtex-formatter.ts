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

function parseNumericYear(value: string | undefined): number {
    if (!value) return NaN;
    const match = value.match(/\d+/)?.[0];
    if (!match) return NaN;
    return Number.parseInt(match, 10);
}

function parseFieldValue(body: string, start: number): { value: string; nextIndex: number } {
    const first = body[start];

    if (first === "{") {
        let depth = 0;
        let i = start;
        while (i < body.length) {
            const ch = body[i];
            if (ch === "{") depth++;
            if (ch === "}") {
                depth--;
                if (depth === 0) {
                    const end = i + 1;
                    return { value: body.slice(start, end), nextIndex: end };
                }
            }
            i++;
        }
        throw new Error("Invalid BibTeX entry: unbalanced braces in field value");
    }

    if (first === '"') {
        let i = start + 1;
        while (i < body.length) {
            if (body[i] === '"' && body[i - 1] !== "\\") {
                const end = i + 1;
                return { value: body.slice(start, end), nextIndex: end };
            }
            i++;
        }
        throw new Error("Invalid BibTeX entry: unbalanced quotes in field value");
    }

    let i = start;
    while (i < body.length && body[i] !== "," && body[i] !== "\n") {
        i++;
    }
    return { value: body.slice(start, i).trim(), nextIndex: i };
}

export function parseBibtexEntry(raw: string): ParsedBibtexEntry {
    const text = raw.trim();
    if (!text.startsWith("@")) {
        throw new Error("Invalid BibTeX entry format");
    }

    const braceIndex = text.indexOf("{");
    if (braceIndex === -1) {
        throw new Error("Invalid BibTeX entry format");
    }

    const entryTypeRaw = text.slice(1, braceIndex).trim();
    if (!/^\w+$/.test(entryTypeRaw)) {
        throw new Error("Invalid BibTeX entry format");
    }

    const payload = text.slice(braceIndex + 1).trim();
    if (!payload.endsWith("}")) {
        throw new Error("Invalid BibTeX entry format");
    }

    const content = payload.slice(0, -1);
    const commaIndex = content.indexOf(",");
    if (commaIndex === -1) {
        throw new Error("Invalid BibTeX entry format");
    }

    const key = content.slice(0, commaIndex).trim();
    const body = content.slice(commaIndex + 1).trim();
    const entryType = entryTypeRaw.toLowerCase();

    const fields: Record<string, string> = {};
    let i = 0;

    while (i < body.length) {
        while (i < body.length && /[\s,]/.test(body[i] ?? "")) {
            i++;
        }
        if (i >= body.length) break;

        const nameStart = i;
        while (i < body.length && /[A-Za-z0-9_-]/.test(body[i] ?? "")) {
            i++;
        }
        const name = body.slice(nameStart, i).toLowerCase();
        if (!name) break;

        while (i < body.length && /\s/.test(body[i] ?? "")) {
            i++;
        }
        if (body[i] !== "=") {
            throw new Error(`Invalid BibTeX entry: expected '=' after field '${name}'`);
        }
        i++;

        while (i < body.length && /\s/.test(body[i] ?? "")) {
            i++;
        }

        const { value, nextIndex } = parseFieldValue(body, i);
        fields[name] = stripWrapping(value);
        i = nextIndex;

        while (i < body.length && /\s/.test(body[i] ?? "")) {
            i++;
        }
        if (body[i] === ",") {
            i++;
        }
    }

    return { entryType, key, fields };
}

export function getValidationWarnings(parsed: ParsedBibtexEntry): string[] {
    const warnings: string[] = [];
    if (!parsed.fields.author) warnings.push("Missing required field: author");
    if (!parsed.fields.title) warnings.push("Missing required field: title");
    if (!parsed.fields.year) warnings.push("Missing required field: year");
    if (!parsed.fields.booktitle && !parsed.fields.journal) {
        warnings.push("Missing required field: booktitle or journal");
    }
    return warnings;
}

function createGeneratedKey(parsed: ParsedBibtexEntry, keyFormat: BibtexKeyFormat): string {
    const authors = splitAuthors(parsed.fields.author ?? "").map(normalizeAuthor).filter(Boolean);
    const title = normalizeWhitespace(parsed.fields.title ?? "");
    const year = parseNumericYear(parsed.fields.year);

    return generateBibtexKey(
        {
            authors,
            year: Number.isFinite(year) ? year : NaN,
            title,
            venue: parsed.fields.booktitle ?? parsed.fields.journal,
        },
        keyFormat,
    );
}

export function deriveBibtexKey(raw: string, keyFormat: BibtexKeyFormat): string | undefined {
    if (keyFormat === "default") return undefined;
    try {
        const parsed = parseBibtexEntry(raw);
        return createGeneratedKey(parsed, keyFormat);
    } catch {
        return undefined;
    }
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
    const warnings = getValidationWarnings(parsed);

    const authors = splitAuthors(parsed.fields.author ?? "").map(normalizeAuthor).filter(Boolean);
    const title = normalizeWhitespace(parsed.fields.title ?? "");
    const year = parseNumericYear(parsed.fields.year);
    const generatedKey = createGeneratedKey(parsed, options?.keyFormat ?? "default");

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
