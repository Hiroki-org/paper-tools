export type BibtexSource = "crossref" | "dblp" | "semanticScholar";

export type BibtexIdentifier = {
    doi?: string;
    title?: string;
};

export type FetchBibtexResult = {
    bibtex: string;
    source: BibtexSource;
};

export type BibtexKeyFormat = "default" | "short" | "venue";

export type BibtexFormat = "bibtex" | "biblatex";

export type BibtexKeyEntry = {
    authors: string[];
    year: number;
    title: string;
    venue?: string;
};

export type ParsedBibtexEntry = {
    entryType: string;
    key: string;
    fields: Record<string, string>;
};

export type FormatResult = {
    formatted: string;
    warnings: string[];
};

export type ValidateIssue = {
    level: "error" | "warning";
    message: string;
    key?: string;
};
