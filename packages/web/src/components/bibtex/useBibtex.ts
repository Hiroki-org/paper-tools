"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type BibtexFormat = "bibtex" | "biblatex";
export type BibtexKeyFormat = "default" | "short" | "venue";

export type BibtexSingleResult = {
    bibtex: string;
    source: string;
    warnings: string[];
};

export type BibtexPaperInput = {
    doi?: string;
    title: string;
};

type BibtexBulkResult = {
    bibtex: string;
    count: number;
    errors: Array<{ title?: string; doi?: string; message: string }>;
};

const SETTINGS_STORAGE_KEY = "paper-tools:bibtex-settings";
const sharedCache = new Map<string, BibtexSingleResult>();

function normalizeDoi(value?: string): string {
    if (!value) return "";
    return value.trim().replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
}

function cacheKey(input: { doi?: string; title?: string; format: BibtexFormat; keyFormat: BibtexKeyFormat }): string {
    return [normalizeDoi(input.doi), (input.title ?? "").trim().toLowerCase(), input.format, input.keyFormat].join("|");
}

export function useBibtex() {
    const [format, setFormat] = useState<BibtexFormat>("bibtex");
    const [keyFormat, setKeyFormat] = useState<BibtexKeyFormat>("default");

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { format?: BibtexFormat; keyFormat?: BibtexKeyFormat };
            if (parsed.format === "bibtex" || parsed.format === "biblatex") {
                setFormat(parsed.format);
            }
            if (parsed.keyFormat === "default" || parsed.keyFormat === "short" || parsed.keyFormat === "venue") {
                setKeyFormat(parsed.keyFormat);
            }
        } catch {
            // ignore storage parse errors
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ format, keyFormat }));
    }, [format, keyFormat]);

    const getSingleBibtex = useCallback(async (
        input: { doi?: string; title?: string },
        overrides?: { format?: BibtexFormat; keyFormat?: BibtexKeyFormat; force?: boolean },
    ): Promise<BibtexSingleResult> => {
        const currentFormat = overrides?.format ?? format;
        const currentKeyFormat = overrides?.keyFormat ?? keyFormat;
        const key = cacheKey({
            doi: input.doi,
            title: input.title,
            format: currentFormat,
            keyFormat: currentKeyFormat,
        });

        if (!overrides?.force && sharedCache.has(key)) {
            return sharedCache.get(key)!;
        }

        const params = new URLSearchParams();
        if (input.doi?.trim()) params.set("doi", input.doi.trim());
        if (input.title?.trim()) params.set("title", input.title.trim());
        params.set("format", currentFormat);
        params.set("keyFormat", currentKeyFormat);

        const res = await fetch(`/api/bibtex?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error ?? "BibTeX の取得に失敗しました");
        }

        const result: BibtexSingleResult = {
            bibtex: String(data.bibtex ?? ""),
            source: String(data.source ?? "unknown"),
            warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
        };
        sharedCache.set(key, result);
        return result;
    }, [format, keyFormat]);

    const getBulkBibtex = useCallback(async (
        papers: BibtexPaperInput[],
        overrides?: { format?: BibtexFormat; keyFormat?: BibtexKeyFormat },
        onProgress?: (done: number, total: number) => void,
    ): Promise<BibtexBulkResult> => {
        const currentFormat = overrides?.format ?? format;
        const currentKeyFormat = overrides?.keyFormat ?? keyFormat;
        onProgress?.(0, papers.length);

        const res = await fetch("/api/bibtex/bulk", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                papers,
                format: currentFormat,
                keyFormat: currentKeyFormat,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error ?? "BibTeX 一括取得に失敗しました");
        }

        const result: BibtexBulkResult = {
            bibtex: String(data.bibtex ?? ""),
            count: Number(data.count ?? 0),
            errors: Array.isArray(data.errors) ? data.errors : [],
        };

        onProgress?.(papers.length, papers.length);
        return result;
    }, [format, keyFormat]);

    return useMemo(() => ({
        format,
        keyFormat,
        setFormat,
        setKeyFormat,
        getSingleBibtex,
        getBulkBibtex,
    }), [format, keyFormat, getSingleBibtex, getBulkBibtex]);
}
