// Types

export type {
	Affiliation,
	AuthorProfile,
	CoauthorInfo,
	TopicTimelineEntry,
} from "./author-types.js";
export { getWorkByDoi, searchWorks } from "./crossref-client.js";

// API Clients
export {
	searchAuthors as searchDblpAuthors,
	searchPublications,
	searchVenuePublications,
} from "./dblp-client.js";
export type {
	OpenAlexAffiliation,
	OpenAlexAuthor,
	OpenAlexConcept,
	OpenAlexCountByYear,
} from "./openalex-client.js";
export {
	getOpenAlexAuthor,
	resolveOpenAlexAuthorId,
} from "./openalex-client.js";
export { getCitations, getReferences } from "./opencitations-client.js";
// Rate limiter
export { fetchWithRetry, RateLimiter } from "./rate-limiter.js";
export type {
	S2Author,
	S2AuthorDetail,
	S2AuthorPapersResponse,
	S2AuthorSearchResponse,
	S2AuthorSummary,
	S2ExternalIds,
	S2OpenAccessPdf,
	S2Paper,
	S2RecommendationOptions,
	S2RecommendationsResponse,
	S2SearchResponse,
} from "./semantic-scholar-client.js";
export {
	getAuthor,
	getAuthorPapers,
	getPaper,
	getRecommendations,
	getRecommendationsForPaper,
	S2_DEFAULT_FIELDS,
	searchAuthors,
	searchPapers,
} from "./semantic-scholar-client.js";
export type {
	Author,
	Citation,
	Conference,
	ConferenceTrack,
	ImportantDate,
	Journal,
	Paper,
} from "./types.js";

// Utilities
export { mapWithConcurrency, outputJson, parsePositiveInt } from "./utils.js";
