import type { BibtexKeyEntry, BibtexKeyFormat } from "./types.js";

const TITLE_STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "of",
    "for",
    "in",
    "on",
    "to",
    "with",
]);

function toAsciiLower(input: string): string {
    return input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function sanitizeToken(input: string): string {
    return toAsciiLower(input).replace(/[^a-z0-9]/g, "");
}

function getFirstAuthorLastName(author: string): string {
    const normalized = author.trim();
    if (!normalized) return "unknown";

    if (normalized.includes(",")) {
        const [last] = normalized.split(",", 1);
        return sanitizeToken(last || "unknown") || "unknown";
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1] ?? "unknown";
    return sanitizeToken(last) || "unknown";
}

function getFirstSignificantTitleWord(title: string): string {
    const tokens = toAsciiLower(title).match(/[a-z0-9]+/g) ?? [];
    const significant = tokens.find((token) => !TITLE_STOP_WORDS.has(token));
    return sanitizeToken(significant ?? tokens[0] ?? "paper") || "paper";
}

function normalizeYear(year: number): string {
    if (!Number.isFinite(year)) return "0000";
    const y = Math.trunc(year);
    if (y < 0) return "0000";
    if (y > 9999) return "9999";
    return String(y).padStart(4, "0");
}

export function generateBibtexKey(
    entry: BibtexKeyEntry,
    format: BibtexKeyFormat = "default",
): string {
    const lastName = getFirstAuthorLastName(entry.authors[0] ?? "unknown");
    const year = normalizeYear(entry.year);
    const firstWord = getFirstSignificantTitleWord(entry.title);

    if (format === "short") {
        return `${lastName}${year}`;
    }

    if (format === "venue") {
        const venueToken = sanitizeToken(entry.venue ?? "");
        if (venueToken) {
            return `${lastName}${year}${venueToken}`;
        }
    }

    return `${lastName}${year}${firstWord}`;
}
