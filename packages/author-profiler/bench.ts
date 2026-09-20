import { mergeAffiliations } from "./src/services/profile-builder.js";
import { performance } from "perf_hooks";

// Generate some sample data
const base = Array.from({ length: 1000 }, (_, i) => ({ name: `Affiliation ${i % 100}`, year: 2000 + (i % 20) }));
const other = Array.from({ length: 1000 }, (_, i) => ({ name: `Affiliation ${i % 150}`, year: 2000 + (i % 25) }));

function runBench(name: string, fn: () => void) {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
        fn();
    }
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms`);
}

runBench("mergeAffiliations", () => {
    mergeAffiliations(base, other);
});
