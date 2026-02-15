// Types
export type {
    Author,
    Paper,
    Citation,
    ImportantDate,
    ConferenceTrack,
    Conference,
    Journal,
} from "./types.js";

// Rate limiter
export { RateLimiter, fetchWithRetry } from "./rate-limiter.js";

// API Clients
export {
    searchPublications,
    searchVenuePublications,
    searchAuthors,
} from "./dblp-client.js";

export { getWorkByDoi, searchWorks } from "./crossref-client.js";

export { getCitations, getReferences } from "./opencitations-client.js";

export {
    S2_DEFAULT_FIELDS,
    getRecommendationsForPaper,
    getRecommendations,
    getPaper,
    searchPapers,
} from "./semantic-scholar-client.js";

export type {
    S2Author,
    S2ExternalIds,
    S2OpenAccessPdf,
    S2Paper,
    S2RecommendationsResponse,
    S2RecommendationOptions,
    S2SearchResponse,
} from "./semantic-scholar-client.js";
