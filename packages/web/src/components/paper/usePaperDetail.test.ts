import { describe, it, expect, beforeEach } from "vitest";
import { preCachePaper, paperCache } from "./usePaperDetail.js";
import type { PaperDetailPreview } from "@/types/paper.js";

describe("preCachePaper", () => {
    beforeEach(() => {
        paperCache.clear();
    });

    it("caches a new paper preview", () => {
        const preview: PaperDetailPreview = {
            paperId: "paper-1",
            title: "Test Paper",
            authors: [{ authorId: "author-1", name: "Alice" }],
        };

        preCachePaper(preview);

        const cached = paperCache.get("paper-1");
        expect(cached).toBeDefined();
        expect(cached?.paperId).toBe("paper-1");
        expect(cached?.title).toBe("Test Paper");
        expect(cached?.authors).toEqual([{ authorId: "author-1", name: "Alice" }]);

        // Check default fields are set correctly
        expect(cached?.citationCount).toBe(0);
        expect(cached?.influentialCitationCount).toBe(0);
        expect(cached?.referenceCount).toBe(0);
        expect(cached?.abstract).toBeNull();
    });

    it("updates an existing cached paper with new preview data", () => {
        const initialPreview: PaperDetailPreview = {
            paperId: "paper-2",
            title: "Initial Title",
            citationCount: 10,
        };
        preCachePaper(initialPreview);

        const updatedPreview: PaperDetailPreview = {
            paperId: "paper-2",
            title: "Updated Title", // Changes title
            referenceCount: 5,     // Adds reference count
        };
        preCachePaper(updatedPreview);

        const cached = paperCache.get("paper-2");
        expect(cached).toBeDefined();
        expect(cached?.paperId).toBe("paper-2");
        expect(cached?.title).toBe("Updated Title"); // Title was updated
        expect(cached?.citationCount).toBe(10);      // Old data was kept
        expect(cached?.referenceCount).toBe(5);      // New data was added
    });

    it("respects MAX_CACHE_ENTRIES and evicts the oldest entry", () => {
        const MAX_CACHE_ENTRIES = 100;

        // Add 100 entries
        for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
            preCachePaper({ paperId: `paper-${i}`, title: `Title ${i}` });
        }

        // Cache is full
        expect(paperCache.size).toBe(MAX_CACHE_ENTRIES);
        expect(paperCache.has("paper-0")).toBe(true);

        // Add 101st entry, which should evict "paper-0"
        preCachePaper({ paperId: "paper-100", title: "Title 100" });

        expect(paperCache.size).toBe(MAX_CACHE_ENTRIES);
        expect(paperCache.has("paper-0")).toBe(false); // Oldest removed
        expect(paperCache.has("paper-1")).toBe(true);
        expect(paperCache.has("paper-100")).toBe(true); // Newest added
    });

    it("does not evict entries when updating an existing entry, even if cache is full", () => {
        const MAX_CACHE_ENTRIES = 100;

        for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
            preCachePaper({ paperId: `paper-${i}`, title: `Title ${i}` });
        }

        // Update paper-0, shouldn't evict
        preCachePaper({ paperId: "paper-0", title: "Updated Title 0" });

        expect(paperCache.size).toBe(MAX_CACHE_ENTRIES);
        expect(paperCache.has("paper-0")).toBe(true);
        expect(paperCache.get("paper-0")?.title).toBe("Updated Title 0");
    });
});
