export {
    getDatabase,
    getDatabaseInfo,
    queryPapers,
    createPaperPage,
    findDuplicates,
} from "./notion-client.js";

export {
    resolveToS2Id,
    recommendFromSingle,
    recommendFromMultiple,
} from "./recommend.js";

export type {
    NotionPaperRecord,
    DuplicateResult,
    DatabaseValidationResult,
    NotionDatabaseInfo,
} from "./notion-client.js";

export type { RecommendOptions } from "./recommend.js";
