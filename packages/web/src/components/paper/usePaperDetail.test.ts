import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to reset modules to clear the module-level paperCache Map between tests
describe("usePaperDetail cache mechanism", () => {
    let usePaperDetailModule: typeof import("./usePaperDetail");

    beforeEach(async () => {
        vi.resetModules();
        usePaperDetailModule = await import("./usePaperDetail");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("preCachePaper should set cache correctly for a new paper", () => {
        const { preCachePaper } = usePaperDetailModule;
        const setSpy = vi.spyOn(Map.prototype, "set");

        preCachePaper({
            paperId: "test-paper-1",
            title: "Test Paper Title 1",
            year: 2023,
            venue: "Test Venue",
        });

        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy).toHaveBeenCalledWith("test-paper-1", expect.objectContaining({
            paperId: "test-paper-1",
            title: "Test Paper Title 1",
            year: 2023,
            venue: "Test Venue",
        }));
    });

    it("preCachePaper should merge patch correctly when paper already exists in cache", () => {
        const { preCachePaper } = usePaperDetailModule;
        const setSpy = vi.spyOn(Map.prototype, "set");

        // First cache
        preCachePaper({
            paperId: "test-paper-2",
            title: "Original Title",
            abstract: "Original Abstract",
        });

        // Clear spy to only track the second call
        setSpy.mockClear();

        // Second cache (patch)
        preCachePaper({
            paperId: "test-paper-2",
            title: "Updated Title", // updating title
            year: 2024, // adding year
        });

        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy).toHaveBeenCalledWith("test-paper-2", expect.objectContaining({
            paperId: "test-paper-2",
            title: "Updated Title", // should be updated
            abstract: "Original Abstract", // should be kept
            year: 2024, // should be added
        }));
    });

    it("preCachePaper should evict the oldest entry when exceeding MAX_CACHE_ENTRIES (100)", () => {
        const { preCachePaper } = usePaperDetailModule;
        const deleteSpy = vi.spyOn(Map.prototype, "delete");

        // MAX_CACHE_ENTRIES is 100, let's insert 105
        for (let i = 0; i < 105; i++) {
            preCachePaper({
                paperId: `paper-${i}`,
                title: `Title ${i}`,
            });
        }

        // It should delete 5 entries
        expect(deleteSpy).toHaveBeenCalledTimes(5);
        // Map iterators maintain insertion order, so the oldest entries are the first ones inserted
        expect(deleteSpy).toHaveBeenNthCalledWith(1, "paper-0");
        expect(deleteSpy).toHaveBeenNthCalledWith(2, "paper-1");
        expect(deleteSpy).toHaveBeenNthCalledWith(3, "paper-2");
        expect(deleteSpy).toHaveBeenNthCalledWith(4, "paper-3");
        expect(deleteSpy).toHaveBeenNthCalledWith(5, "paper-4");
    });
});
