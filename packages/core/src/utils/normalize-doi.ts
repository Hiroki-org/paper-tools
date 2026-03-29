export function normalizeDoi(doi: string): string;
export function normalizeDoi(doi?: string | null): string | undefined;
export function normalizeDoi(doi?: string | null): string | undefined {
    if (doi == null) return undefined;
    const trimmed = doi.trim();
    return trimmed.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
}
