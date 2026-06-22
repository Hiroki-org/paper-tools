const { performance } = require('perf_hooks');

const STOP_WORDS = new Set(["the", "and", "a", "an"]);

// ORIGINAL
function tokenizeOriginal(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// OPTIMIZED
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9\s-]/g;
const WHITESPACE_REGEX = /\s+/;

function tokenizeOptimized(text) {
    return text
        .toLowerCase()
        .replace(NON_ALPHANUMERIC_REGEX, " ")
        .split(WHITESPACE_REGEX)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

const text = "This is a sample text for tokenization. It includes some punctuation! And some numbers 12345. Let's see how fast it can tokenize this long string repeatedly. Tokenizing is an important part of text processing, often used in natural language processing and search engines.";

const ITERATIONS = 1000000;

console.log("Warming up...");
for (let i = 0; i < 10000; i++) {
    tokenizeOriginal(text);
    tokenizeOptimized(text);
}

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const startOriginal = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    tokenizeOriginal(text);
}
const endOriginal = performance.now();

const startOptimized = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    tokenizeOptimized(text);
}
const endOptimized = performance.now();

const timeOriginal = endOriginal - startOriginal;
const timeOptimized = endOptimized - startOptimized;

console.log(`Original: ${timeOriginal.toFixed(2)} ms`);
console.log(`Optimized: ${timeOptimized.toFixed(2)} ms`);
console.log(`Improvement: ${((timeOriginal - timeOptimized) / timeOriginal * 100).toFixed(2)}%`);
