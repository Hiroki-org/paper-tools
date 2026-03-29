const fs = require('fs');
const filePath = 'packages/author-profiler/src/tests/author-client.test.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
    'import { findExistingAuthorPage, saveAuthorProfileToNotion } from "../notion/author-client";',
    'import { findExistingAuthorPage, saveAuthorProfileToNotion } from "../notion/author-client.js";'
);

code = code.replace(
    'let mockClient: any;',
    `type MockNotionClient = {
    databases: { query: ReturnType<typeof vi.fn> };
    pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};
    let mockClient: MockNotionClient;`
);

fs.writeFileSync(filePath, code);
