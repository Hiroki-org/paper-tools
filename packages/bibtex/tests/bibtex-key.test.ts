import { describe, expect, it } from "vitest";
import { generateBibtexKey } from "../src/bibtex-key.js";

describe("generateBibtexKey", () => {
    it("generates default key with first author/year/title word", () => {
        const key = generateBibtexKey({
            authors: ["Hiroki Mukai", "Alice Smith"],
            year: 2026,
            title: "The Boundary of Fuzzing in Modern Systems",
        });
        expect(key).toBe("mukai2026boundary");
    });

    it("normalizes accents in author names", () => {
        const key = generateBibtexKey({
            authors: ["René Descartes"],
            year: 1637,
            title: "Discourse on Method",
        });
        expect(key).toBe("descartes1637discourse");
    });

    it("supports short format", () => {
        const key = generateBibtexKey({
            authors: ["Mukai, Hiroki"],
            year: 2026,
            title: "Any Title",
        }, "short");
        expect(key).toBe("mukai2026");
    });

    it("supports venue format", () => {
        const key = generateBibtexKey({
            authors: ["Alice Smith"],
            year: 2023,
            title: "Deep Learning Advances",
            venue: "NeurIPS",
        }, "venue");
        expect(key).toBe("smith2023neurips");
    });

    it("falls back to default format when venue is requested but missing", () => {
        const key = generateBibtexKey({
            authors: ["Bob Jones"],
            year: 2024,
            title: "Understanding Complex Systems",
        }, "venue");
        expect(key).toBe("jones2024understanding");
    });
});
