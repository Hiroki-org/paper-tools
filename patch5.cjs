const fs = require('fs');
const filePath = 'packages/author-profiler/src/tests/author-client.test.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
    /const id = await findExistingAuthorPage\(mockProfile, "db-123", mockClient\);/g,
    'const id = await findExistingAuthorPage(mockProfile, "db-123", mockClient as any);'
);
code = code.replace(
    /const result = await saveAuthorProfileToNotion\(mockProfile, \{\}, mockClient\);/g,
    'const result = await saveAuthorProfileToNotion(mockProfile, {}, mockClient as any);'
);
code = code.replace(
    /const result = await saveAuthorProfileToNotion\(mockProfile, \{ dryRun: true \}, mockClient\);/g,
    'const result = await saveAuthorProfileToNotion(mockProfile, { dryRun: true }, mockClient as any);'
);
code = code.replace(
    /await expect\(saveAuthorProfileToNotion\(mockProfile, \{\}, mockClient\)\)\.rejects\.toThrow\(/g,
    'await expect(saveAuthorProfileToNotion(mockProfile, {}, mockClient as any)).rejects.toThrow('
);

fs.writeFileSync(filePath, code);
