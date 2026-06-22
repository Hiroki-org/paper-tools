import { describe, expect, it } from "vitest";
import { formatBibtex, deriveBibtexKey } from "../src/bibtex-formatter.js";

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
