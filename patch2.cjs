const fs = require('fs');
const filePath = 'packages/author-profiler/src/tests/author-client.test.ts';
let code = fs.readFileSync(filePath, 'utf8');
code = code.replace(
    'import { describe, it, expect, vi, beforeEach } from "vitest";',
    'import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";'
);
fs.writeFileSync(filePath, code);
