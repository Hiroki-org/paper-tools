import type { Paper } from "./types.js";

export interface Affiliation {
    name: string;
    year?: number;
}

export interface CoauthorInfo {
    authorId: string;
    name: string;
    paperCount: number;
}

export interface TopicTimelineEntry {
    year: number;
    topics: { name: string; score: number }[];
}

export interface AuthorProfile {
    id: string;
    name: string;
    aliases?: string[];
    affiliations: Affiliation[];
    homepage?: string;
    hIndex: number;
    citationCount: number;
    paperCount: number;
    influentialCitationCount: number;
    topPapers: Paper[];
    coauthors: CoauthorInfo[];
    topicTimeline: TopicTimelineEntry[];
}
