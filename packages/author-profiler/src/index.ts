export type {
	SaveAuthorProfileOptions,
	SaveAuthorProfileResult,
} from "./notion/author-client.js";
export {
	findExistingAuthorPage,
	saveAuthorProfileToNotion,
} from "./notion/author-client.js";
export type {
	AuthorResolution,
	ResolveAuthorOptions,
} from "./services/author-resolver.js";
export { resolveAuthorId } from "./services/author-resolver.js";
export {
	aggregateCoauthorsFromPapers,
	buildCoauthorNetwork,
} from "./services/coauthor-network.js";

export type { BuildAuthorProfileOptions } from "./services/profile-builder.js";
export { buildAuthorProfile } from "./services/profile-builder.js";
