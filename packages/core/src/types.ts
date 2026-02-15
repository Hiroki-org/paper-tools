/**
 * 著者情報
 */
export interface Author {
    name: string;
    affiliations?: string[];
    orcid?: string;
}

/**
 * 論文メタデータ
 */
export interface Paper {
    title: string;
    authors: Author[];
    doi?: string;
    year?: number;
    venue?: string;
    abstract?: string;
    keywords?: string[];
    url?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    citationCount?: number;
    referenceCount?: number;
}

/**
 * 引用関係
 */
export interface Citation {
    citing: string; // DOI
    cited: string; // DOI
    creationDate?: string;
}

/**
 * 学会の締切情報
 */
export interface ImportantDate {
    date: string; // ISO 8601 date string
    description: string;
}

/**
 * 学会トラック
 */
export interface ConferenceTrack {
    name: string;
    url?: string;
}

/**
 * 学会情報
 */
export interface Conference {
    name: string;
    fullName?: string;
    year: number;
    location?: string;
    startDate?: string;
    endDate?: string;
    url?: string;
    tracks: ConferenceTrack[];
    importantDates: ImportantDate[];
    acceptedPapers?: Paper[];
}

/**
 * ジャーナル情報
 */
export interface Journal {
    name: string;
    volume?: string;
    issue?: string;
    year?: number;
}
