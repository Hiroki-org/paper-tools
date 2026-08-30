import { describe, expect, it } from "vitest";
import { deriveBibtexKey, formatBibtex, parseBibtexEntry, splitBibtexEntries, getValidationWarnings } from "../src/bibtex-formatter.js";

describe("bibtex-formatter", () => {
    describe("getValidationWarnings", () => {
        it("returns empty array when all required fields are present", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    title: "Title",
                    year: "2024",
                    journal: "Journal"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual([]);
        });

        it("returns warning for missing author", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    title: "Title",
                    year: "2024",
                    journal: "Journal"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual(["Missing required field: author"]);
        });

        it("returns warning for missing title", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    year: "2024",
                    journal: "Journal"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual(["Missing required field: title"]);
        });

        it("returns warning for missing year", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    title: "Title",
                    journal: "Journal"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual(["Missing required field: year"]);
        });

        it("returns warning for missing booktitle or journal", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    title: "Title",
                    year: "2024"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual(["Missing required field: booktitle or journal"]);
        });

        it("returns empty array when booktitle is present but journal is missing", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    title: "Title",
                    year: "2024",
                    booktitle: "Book"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual([]);
        });

        it("returns empty array when journal is present but booktitle is missing", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {
                    author: "Smith",
                    title: "Title",
                    year: "2024",
                    journal: "Journal"
                }
            };
            expect(getValidationWarnings(parsed)).toEqual([]);
        });

        it("returns multiple warnings if multiple fields are missing", () => {
            const parsed = {
                entryType: "article",
                key: "test",
                fields: {}
            };
            expect(getValidationWarnings(parsed)).toEqual([
                "Missing required field: author",
                "Missing required field: title",
                "Missing required field: year",
                "Missing required field: booktitle or journal"
            ]);
        });
    });
    describe("deriveBibtexKey", () => {
        it("returns undefined if keyFormat is 'default'", () => {
            const result = deriveBibtexKey(`@article{tmp, title={Paper}, author={Alice Smith}, year={2024}, journal={J}}`, "default");
            expect(result).toBeUndefined();
        });

        it("returns a generated key for valid bibtex entry with valid format", () => {
            const result = deriveBibtexKey(`@article{tmp, title={Sample Paper}, author={Alice Smith and Bob Jones}, year={2024}, journal={Journal of Testing}}`, "short");
            expect(result).toBeDefined();
            expect(typeof result).toBe("string");
            expect(result).not.toBe("tmp");
        });

        it("returns undefined for invalid bibtex entry", () => {
            const result = deriveBibtexKey(`invalid bibtex string`, "short");
            expect(result).toBeUndefined();
        });
    });

    it("parses a single bibtex entry", () => {
        const parsed = parseBibtexEntry(`@article{tmp, title={Paper}, author={Alice Smith}, year={2024}, journal={J}}`);
        expect(parsed.entryType).toBe("article");
        expect(parsed.key).toBe("tmp");
        expect(parsed.fields.title).toBe("Paper");
    });

    it("formats and normalizes author names", () => {
        const { formatted, warnings } = formatBibtex(`@article{tmp,
  title={Sample Paper},
  author={Alice Smith and Bob Jones},
  year={2024},
  journal={Journal of Testing}
}`);
        expect(warnings).toHaveLength(0);
        expect(formatted).toContain("author = {Smith, Alice and Jones, Bob}");
        expect(formatted).toContain("@article{smith2024sample");
    });

    it("returns warnings for missing required fields", () => {
        const { warnings } = formatBibtex(`@inproceedings{tmp, title={X}}`);
        expect(warnings.some((w) => w.includes("author"))).toBe(true);
        expect(warnings.some((w) => w.includes("year"))).toBe(true);
    });

    it("splits multiple entries", () => {
        const entries = splitBibtexEntries(`@article{a,title={A}}

@article{b,title={B}}`);
        expect(entries).toHaveLength(2);
    });

    it("parses nested braces in field values", () => {
        const parsed = parseBibtexEntry(`@article{k,
  title={An article with {nested {curly braces}} in title},
  author={Alice Smith},
  year={2024},
  journal={J}
}`);
        expect(parsed.fields.title).toBe("An article with {nested {curly braces}} in title");
    });

    it("throws for malformed header patterns that used to trigger regex backtracking", () => {
        const malicious = `@a{{${" ".repeat(5000)}}`;
        expect(() => parseBibtexEntry(malicious)).toThrow("Invalid BibTeX entry format");
    });
}
);
