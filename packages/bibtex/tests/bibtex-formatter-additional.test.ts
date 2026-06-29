import { describe, expect, it } from "vitest";
import { formatBibtex, deriveBibtexKey, splitBibtexEntries } from "../src/bibtex-formatter.js";

describe("bibtex-formatter additional tests", () => {
    it("preserves ordering of non-priority fields alphabetically", () => {
        const raw = `@article{test, title={A title}, author={Author}, zzz={1}, aaa={2}}`;
        const { formatted } = formatBibtex(raw);
        const zzzIndex = formatted.indexOf("zzz = {1}");
        const aaaIndex = formatted.indexOf("aaa = {2}");
        expect(aaaIndex).toBeLessThan(zzzIndex);
    });

    it("handles fields that are missing gracefully when creating generated key", () => {
        const raw = `@article{test, }`;
        const result = deriveBibtexKey(raw, "short");
        expect(result).toBeDefined();
    });

    it("formats with biblatex format and changes entryType if conference", () => {
        const raw = `@conference{test, title={A title}, author={Author}}`;
        const { formatted } = formatBibtex(raw, { key: "test", format: "biblatex" });
        expect(formatted).toContain("@inproceedings{test");
    });
});

describe("bibtex-formatter missing author logic tests", () => {
    it("handles normalizing missing or empty author", () => {
        const raw = `@article{test, title={A title}}`;
        const result = deriveBibtexKey(raw, "short");
        expect(result).toBeDefined();
    });

    it("formats with empty author", () => {
        const raw = `@article{test, title={A title}}`;
        const { formatted } = formatBibtex(raw);
        expect(formatted).not.toContain("author");
    });
});

describe("bibtex-formatter author normalizing tests", () => {
    it("handles author with comma", () => {
        const raw = `@article{test, title={A title}, author={Smith, Alice}}`;
        const result = deriveBibtexKey(raw, "short");
        expect(result).toBeDefined();
    });
});

describe("bibtex-formatter string wrapping tests", () => {
    it("handles fields wrapped with quotes", () => {
        const raw = `@article{test, title="A title"}`;
        const { formatted } = formatBibtex(raw);
        expect(formatted).toContain("title = {A title}");
    });

    it("handles fields wrapped without braces or quotes", () => {
        const raw = `@article{test, year=2024}`;
        const { formatted } = formatBibtex(raw);
        expect(formatted).toContain("year = {2024}");
    });
});

describe("bibtex-formatter entry split and format coverage", () => {
    it("handles break at braceStart -1", () => {
        const entries = splitBibtexEntries(`@article`);
        expect(entries).toHaveLength(0);
    });

    it("handles missing entryType in options gracefully", () => {
        const raw = `@article{test, }`;
        const { formatted } = formatBibtex(raw, { key: "test" });
        expect(formatted).toContain("@article{test");
    });
});

describe("bibtex-formatter year parsing tests", () => {
    it("handles parsing non-numeric year gracefully", () => {
        const raw = `@article{test, year="n.d."}`;
        const result = deriveBibtexKey(raw, "short");
        expect(result).toBeDefined();
    });
});
