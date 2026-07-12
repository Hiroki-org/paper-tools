const fs = require('fs');

const path = 'packages/scraper/tests/researchr-scraper.test.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /describe\("scrapeConference", \(\) => {/;
const count = (code.match(regex) || []).length;
console.log(count);
