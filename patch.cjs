const fs = require('fs');
const filePath = 'packages/core/src/semantic-scholar-client.ts';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
if (lines[161].includes('return await parseResponse<S2RecommendationsResponse>(response);')) {
    lines[161] = lines[161].replace('return await', 'return');
} else {
    console.error("Line 162 doesn't match expected content.");
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log("File patched.");
