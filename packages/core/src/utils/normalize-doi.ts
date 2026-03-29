export function normalizeDoi(doi: string): string;
export function normalizeDoi(doi?: string | null): string | undefined;
export function normalizeDoi(doi?: string | null): string | undefined {
    if (!doi) return undefined;
    const trimmed = doi.trim();
    const result = trimmed.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
    return result === "" ? undefined : result;
}
