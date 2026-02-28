export interface PaperDetail {
    paperId: string;
    title: string;
    abstract: string | null;
    authors: Array<{ authorId: string; name: string }>;
    year: number | null;
    venue: string;
    citationCount: number;
    influentialCitationCount: number;
    referenceCount: number;
    externalIds: {
        DOI?: string;
        ArXiv?: string;
        ACL?: string;
        DBLP?: string;
        CorpusId?: number;
    };
    url: string;
    tldr: { model: string; text: string } | null;
    fieldsOfStudy: Array<{ category: string; source: string }> | null;
    publicationDate: string | null;
    journal: { name: string; volume?: string; pages?: string } | null;
}

export type PaperDetailPreview = Partial<PaperDetail> & { paperId: string };
