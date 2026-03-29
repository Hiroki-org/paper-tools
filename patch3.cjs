const fs = require('fs');
const filePath = 'packages/author-profiler/src/tests/author-client.test.ts';
let code = fs.readFileSync(filePath, 'utf8');
code = code.replace(
    'import { Client } from "@notionhq/client";\n',
    ''
);
fs.writeFileSync(filePath, code);
