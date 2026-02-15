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
