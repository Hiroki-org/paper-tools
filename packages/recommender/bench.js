import { performance } from "perf_hooks";

const PROPERTY_SPECS = {
    "タイトル": { type: "title", required: true },
    "DOI": { type: "rich_text", required: true },
    "著者": { type: "rich_text", required: false },
    "年": { type: "number", required: false },
    "会議/ジャーナル": { type: "rich_text", required: false },
    "被引用数": { type: "number", required: false },
    "分野": { type: "multi_select", required: false },
    "ソース": { type: "select", required: false },
    "Open Access PDF": { type: "url", required: false },
    "Semantic Scholar ID": { type: "rich_text", required: false },
    "要約": { type: "rich_text", required: false },
};

const properties = {
    "タイトル": { type: "title" },
    "DOI": { type: "rich_text" },
    "著者": { type: "rich_text" },
    "年": { type: "number" },
    "会議/ジャーナル": { type: "rich_text" },
    "被引用数": { type: "number" },
    "分野": { type: "multi_select" },
    "ソース": { type: "select" },
    "Open Access PDF": { type: "url" },
    "Semantic Scholar ID": { type: "rich_text" },
    "要約": { type: "rich_text" },
};

function original() {
    const missingRequired = [];
    const missingOptional = [];

    for (const [name, spec] of Object.entries(PROPERTY_SPECS)) {
        const actual = properties[name];
        if (!actual) {
            if (spec.required) {
                missingRequired.push(name);
            } else {
                missingOptional.push(name);
            }
            continue;
        }
        if (actual.type !== spec.type) {
            throw new Error();
        }
    }
}

const PROPERTY_SPECS_ENTRIES = Object.entries(PROPERTY_SPECS);

function optimized() {
    const missingRequired = [];
    const missingOptional = [];

    for (const [name, spec] of PROPERTY_SPECS_ENTRIES) {
        const actual = properties[name];
        if (!actual) {
            if (spec.required) {
                missingRequired.push(name);
            } else {
                missingOptional.push(name);
            }
            continue;
        }
        if (actual.type !== spec.type) {
            throw new Error();
        }
    }
}

const N = 1000000;

let start = performance.now();
for (let i = 0; i < N; i++) {
    original();
}
console.log("Original:", performance.now() - start, "ms");

start = performance.now();
for (let i = 0; i < N; i++) {
    optimized();
}
console.log("Optimized:", performance.now() - start, "ms");
