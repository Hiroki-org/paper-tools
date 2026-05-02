const { performance } = require('perf_hooks');

const tagKeys = ['Tags'];
const records = [];
for (let i = 0; i < 10000; i++) {
    records.push({
        properties: {
            Name: { title: [{ plain_text: 'Title ' + i }] },
            Tags: { multi_select: [{ name: 'A' }, { name: 'B' }] },
            Date: { date: { start: '2023-01-01' } },
            Prop1: { type: 'rich_text' },
            Prop2: { type: 'rich_text' },
            Prop3: { type: 'rich_text' },
        }
    });
}

function normalizeTag(value) {
    return value.trim();
}

function testCurrent() {
    const uniqueTags = new Map();
    for (const record of records) {
        for (const key of tagKeys) {
            const items = record.properties[key]?.multi_select ?? [];
            for (const item of items) {
                const normalized = normalizeTag(item.name ?? "");
                if (!normalized) continue;
                const dedupeKey = normalized.toLowerCase();
                if (!uniqueTags.has(dedupeKey)) {
                    uniqueTags.set(dedupeKey, normalized);
                }
            }
        }
    }
    return uniqueTags.size;
}

function testOptimized3() {
    const uniqueTags = new Map();

    // Invert the loops: Outer loop over keys, inner loop over records.
    // However, the records are paginated! So we receive one page of records at a time.
    // In the real code, we loop over pages, then records, then keys.
    // Let's mimic looping over one page of records.
    const pageRecords = records;

    for (const key of tagKeys) {
        for (const record of pageRecords) {
            const items = record.properties[key]?.multi_select;
            if (!items) continue; // Avoid ?? [] allocation
            for (const item of items) {
                const name = item.name;
                if (!name) continue;
                const normalized = name.trim();
                if (!normalized) continue;
                const dedupeKey = normalized.toLowerCase();
                if (!uniqueTags.has(dedupeKey)) {
                    uniqueTags.set(dedupeKey, normalized);
                }
            }
        }
    }
    return uniqueTags.size;
}

const start1 = performance.now();
for(let i = 0; i < 100; i++) testCurrent();
console.log('Current:', performance.now() - start1);

const start2 = performance.now();
for(let i = 0; i < 100; i++) testOptimized3();
console.log('Optimized3:', performance.now() - start2);
