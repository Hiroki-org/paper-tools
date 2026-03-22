export function normalizeDoi(doi: string): string;
export function normalizeDoi(doi?: string | null): string | undefined;
export function normalizeDoi(doi?: string | null): string | undefined {
    if (!doi) return undefined;
    return doi.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
}
