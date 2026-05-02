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

function testOptimized() {
    const uniqueTags = new Map();
    const isSingle = tagKeys.length === 1;
    const singleKey = tagKeys[0];

    for (const record of records) {
        if (isSingle) {
            const items = record.properties[singleKey]?.multi_select;
            if (items) {
                for (const item of items) {
                    const normalized = normalizeTag(item.name ?? "");
                    if (!normalized) continue;
                    const dedupeKey = normalized.toLowerCase();
                    if (!uniqueTags.has(dedupeKey)) {
                        uniqueTags.set(dedupeKey, normalized);
                    }
                }
            }
        } else {
            for (const key of tagKeys) {
                const items = record.properties[key]?.multi_select;
                if (items) {
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
        }
    }
    return uniqueTags.size;
}

const start1 = performance.now();
for(let i = 0; i < 100; i++) testCurrent();
console.log('Current:', performance.now() - start1);

const start2 = performance.now();
for(let i = 0; i < 100; i++) testOptimized();
console.log('Optimized:', performance.now() - start2);
