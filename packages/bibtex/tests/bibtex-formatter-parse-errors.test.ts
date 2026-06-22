import { describe, expect, it } from "vitest";
import { parseBibtexEntry } from "../src/bibtex-formatter.js";

describe("bibtex-formatter parse tests", () => {
    it("throws for missing = after field name", () => {
        expect(() => parseBibtexEntry(`@article{test, field }`)).toThrow("Invalid BibTeX entry: expected '=' after field 'field'");
    });

    it("throws for unbalanced quotes in field value", () => {
        expect(() => parseBibtexEntry(`@article{test, field="unbalanced }`)).toThrow("Invalid BibTeX entry: unbalanced quotes in field value");
    });

    it("throws for unbalanced braces in field value", () => {
        expect(() => parseBibtexEntry(`@article{test, field={unbalanced }`)).toThrow("Invalid BibTeX entry: unbalanced braces in field value");
    });

    it("handles whitespace around commas and equals", () => {
        const parsed = parseBibtexEntry(`@article{test, field  =  "value"  , }`);
        expect(parsed.fields.field).toBe("value");
    });
});

describe("bibtex-formatter entry parse tests", () => {
    it("throws for entry missing brace", () => {
        expect(() => parseBibtexEntry(`@article`)).toThrow("Invalid BibTeX entry format");
    });
    it("throws for invalid entry type", () => {
        expect(() => parseBibtexEntry(`@art icle{test, }`)).toThrow("Invalid BibTeX entry format");
    });
    it("throws for entry missing closing brace", () => {
        expect(() => parseBibtexEntry(`@article{test, `)).toThrow("Invalid BibTeX entry format");
    });
});
