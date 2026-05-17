import { describe, it, expect } from "vitest";
import { enrichWithDblp } from "../src/dblp-integration.js";
import type { Conference, Paper } from "@paper-tools/core";

describe("dblp-integration", () => {
    it("enrichWithDblp merges correctly", async () => {
        const conf: Conference = {
            id: "test",
            name: "Test",
            year: 2024,
            url: "",
            acceptedPapers: [
                { title: "Test Paper 1", doi: "10.1000/1", authors: [] },
                { title: "Test Paper 2", authors: [] }
            ]
        } as unknown as Conference;

        const dblpPapers: Paper[] = [
            { title: "Test Paper 1", doi: "10.1000/1", authors: ["Author A"], year: 2024, venue: "Test" } as unknown as Paper,
            { title: "Test Paper 3", authors: ["Author B"], year: 2024, venue: "Test" } as unknown as Paper,
        ];

        const enriched = await enrichWithDblp(conf, dblpPapers);

        expect(enriched.acceptedPapers).toBeDefined();
        if (enriched.acceptedPapers) {
            expect(enriched.acceptedPapers.length).toBe(3);
            const p1 = enriched.acceptedPapers.find((p: Paper) => p.doi === "10.1000/1");
            expect(p1?.authors).toEqual(["Author A"]);
        }
    });
});
