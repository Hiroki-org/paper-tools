// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePaperDetail, preCachePaper } from "./usePaperDetail";
import type { PaperDetail, PaperDetailPreview } from "@/types/paper";

describe("usePaperDetail", () => {
    const mockPaperId = "test-paper-123";

    const mockPaperDetail: PaperDetail = {
        paperId: mockPaperId,
        title: "Test Paper Title",
        abstract: "This is a test abstract.",
        authors: [{ authorId: "author-1", name: "Test Author" }],
        year: 2024,
        venue: "Test Venue",
        citationCount: 10,
        influentialCitationCount: 2,
        referenceCount: 20,
        externalIds: { DOI: "10.1234/test" },
        url: "https://www.semanticscholar.org/paper/test-paper-123",
        tldr: null,
        fieldsOfStudy: null,
        publicationDate: null,
        journal: null,
    };

    beforeEach(() => {
        // Reset cache between tests. Since we don't export paperCache,
        // we can test the hook's behavior by mocking fetch.
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should start with null paper and return immediately if paperId is null", () => {
        const { result } = renderHook(() => usePaperDetail(null));
        expect(result.current.paper).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("should load paper from API successfully", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => mockPaperDetail,
        } as Response);

        const { result } = renderHook(() => usePaperDetail(mockPaperId));

        expect(result.current.loading).toBe(true);
        expect(result.current.paper).toBeNull();
        expect(result.current.error).toBeNull();

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.paper).toEqual(mockPaperDetail);
        expect(result.current.error).toBeNull();
        expect(fetch).toHaveBeenCalledWith(`/api/paper/${encodeURIComponent(mockPaperId)}`);
    });

    it("should handle API error gracefully", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Paper not found" }),
        } as Response);

        const { result } = renderHook(() => usePaperDetail("missing-id"));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.paper).toBeNull();
        expect(result.current.error).toBe("Paper not found");
    });

    it("should handle network error gracefully", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("Network Error"));

        const { result } = renderHook(() => usePaperDetail("error-id"));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.paper).toBeNull();
        expect(result.current.error).toBe("Network Error");
    });
});

describe("preCachePaper", () => {
    it("should precache a paper preview correctly", async () => {
        // Import module dynamically to test state modifications cleanly
        vi.resetModules();
        const { preCachePaper, usePaperDetail } = await import("./usePaperDetail");

        const preview: PaperDetailPreview = {
            paperId: "precache-1",
            title: "Precached Paper",
        };

        // Cache the paper preview
        preCachePaper(preview);

        // Mock fetch to simulate slow network, but since it's cached it should load from cache
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))));

        const { result } = renderHook(() => usePaperDetail("precache-1"));

        // It should immediately have the partial paper from cache
        expect(result.current.paper).not.toBeNull();
        expect(result.current.paper?.title).toBe("Precached Paper");
    });

    it("should update existing cache with new preview data", async () => {
        vi.resetModules();
        const { preCachePaper, usePaperDetail } = await import("./usePaperDetail");

        const preview1: PaperDetailPreview = {
            paperId: "precache-2",
            title: "Initial Title",
        };

        preCachePaper(preview1);

        const preview2: PaperDetailPreview = {
            paperId: "precache-2",
            title: "Updated Title",
            year: 2025,
        };

        preCachePaper(preview2);

        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))));

        const { result } = renderHook(() => usePaperDetail("precache-2"));

        expect(result.current.paper).not.toBeNull();
        expect(result.current.paper?.title).toBe("Updated Title");
        expect(result.current.paper?.year).toBe(2025);
    });
});
