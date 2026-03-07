import { test } from 'vitest';
import { performance } from 'perf_hooks';

test('Benchmark regex vs toLowerCase', () => {
    const texts = [
        "Main Track",
        "Technical Track",
        "Workshop on Software Engineering",
        "International Symposium on Testing",
        "Tool Demo",
        "Keynote",
        "Tutorial: How to use Vitest",
        "Industry Track",
        "Doctoral Symposium",
        "Some random text that doesn't match anything",
        "Another string without any of the keywords",
        "Just a generic heading",
    ];

    // Repeat to make it measurable
    const iterations = 100000;

    // Baseline: Current
    const start1 = performance.now();
    let count1 = 0;
    for (let i = 0; i < iterations; i++) {
        for (const text of texts) {
            if (
                text.toLowerCase().includes("track") ||
                text.toLowerCase().includes("workshop") ||
                text.toLowerCase().includes("tutorial") ||
                text.toLowerCase().includes("symposium")
            ) {
                count1++;
            }
        }
    }
    const end1 = performance.now();

    // Variable assignment
    const start2 = performance.now();
    let count2 = 0;
    for (let i = 0; i < iterations; i++) {
        for (const text of texts) {
            const lower = text.toLowerCase();
            if (
                lower.includes("track") ||
                lower.includes("workshop") ||
                lower.includes("tutorial") ||
                lower.includes("symposium")
            ) {
                count2++;
            }
        }
    }
    const end2 = performance.now();

    // Regex
    const start3 = performance.now();
    let count3 = 0;
    const regex = /track|workshop|tutorial|symposium/i;
    for (let i = 0; i < iterations; i++) {
        for (const text of texts) {
            if (regex.test(text)) {
                count3++;
            }
        }
    }
    const end3 = performance.now();

    console.log(`Baseline (4x toLowerCase): ${(end1 - start1).toFixed(2)}ms`);
    console.log(`Variable (1x toLowerCase): ${(end2 - start2).toFixed(2)}ms`);
    console.log(`Regex: ${(end3 - start3).toFixed(2)}ms`);
    console.log(`Counts: ${count1}, ${count2}, ${count3}`);
});
