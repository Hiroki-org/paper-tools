export { resolveAuthorId } from "./services/author-resolver.js";
export { buildAuthorProfile } from "./services/profile-builder.js";
export { aggregateCoauthorsFromPapers } from "./services/coauthor-network.js";
export { saveAuthorProfileToNotion, findExistingAuthorPage } from "./notion/author-client.js";

export type {
    AuthorResolution,
    ResolveAuthorOptions,
} from "./services/author-resolver.js";

export type {
    BuildAuthorProfileOptions,
} from "./services/profile-builder.js";

export type {
    SaveAuthorProfileOptions,
    SaveAuthorProfileResult,
} from "./notion/author-client.js";
