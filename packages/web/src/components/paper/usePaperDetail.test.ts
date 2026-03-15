import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

        preCachePaper({
            paperId: "test-paper-2",
            title: "Original Title",
            abstract: "Original Abstract",
        });

        setSpy.mockClear();

        preCachePaper({
            paperId: "test-paper-2",
            title: "Updated Title",
            year: 2024,
        });

        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy).toHaveBeenCalledWith("test-paper-2", expect.objectContaining({
            paperId: "test-paper-2",
            title: "Updated Title",
            abstract: "Original Abstract",
            year: 2024,
        }));
    });

    it("preCachePaper should evict the oldest entry when exceeding MAX_CACHE_ENTRIES (100)", () => {
        const { preCachePaper } = usePaperDetailModule;
        const deleteSpy = vi.spyOn(Map.prototype, "delete");

        for (let i = 0; i < 105; i++) {
            preCachePaper({
                paperId: `paper-${i}`,
                title: `Title ${i}`,
            });
        }

        expect(deleteSpy).toHaveBeenCalledTimes(5);
        expect(deleteSpy).toHaveBeenNthCalledWith(1, "paper-0");
        expect(deleteSpy).toHaveBeenNthCalledWith(2, "paper-1");
        expect(deleteSpy).toHaveBeenNthCalledWith(3, "paper-2");
        expect(deleteSpy).toHaveBeenNthCalledWith(4, "paper-3");
        expect(deleteSpy).toHaveBeenNthCalledWith(5, "paper-4");
    });

    it("preCachePaper should not evict when updating an existing entry at full capacity", () => {
        const { preCachePaper } = usePaperDetailModule;
        const deleteSpy = vi.spyOn(Map.prototype, "delete");
        const setSpy = vi.spyOn(Map.prototype, "set");

        for (let i = 0; i < 100; i++) {
            preCachePaper({
                paperId: `paper-${i}`,
                title: `Title ${i}`,
            });
        }

        deleteSpy.mockClear();
        setSpy.mockClear();

        preCachePaper({
            paperId: "paper-0",
            title: "Updated Title 0",
        });

        expect(deleteSpy).not.toHaveBeenCalled();
        expect(setSpy).toHaveBeenCalledWith("paper-0", expect.objectContaining({
            paperId: "paper-0",
            title: "Updated Title 0",
        }));
    });
});
