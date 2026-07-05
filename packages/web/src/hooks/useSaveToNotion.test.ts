// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { useSaveToNotion } from "./useSaveToNotion";
import type { S2Paper } from "@paper-tools/core";

describe("useSaveToNotion", () => {
    const mockPaper: S2Paper = {
        paperId: "test-paper-123",
        title: "Test Paper Title",
        authors: [{ authorId: "author-1", name: "Test Author" }],
        year: 2024,
        venue: "Test Venue",
        citationCount: 10,
        referenceCount: 20,
        externalIds: { DOI: "10.1234/test" },
        url: "https://www.semanticscholar.org/paper/test-paper-123",
    };

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should initialize with idle status and no error", () => {
        const { result } = renderHook(() => useSaveToNotion({}));
        expect(result.current.status).toBe("idle");
        expect(result.current.error).toBeNull();
        expect(typeof result.current.save).toBe("function");
    });

    it("should do nothing if already saved", async () => {
        const onSaved = vi.fn();
        const { result } = renderHook(() => useSaveToNotion({ saved: true, onSaved }));

        act(() => {
            result.current.save();
        });

        expect(fetch).not.toHaveBeenCalled();
        expect(result.current.status).toBe("idle");
        expect(onSaved).not.toHaveBeenCalled();
    });

    it("should save directly when paper is provided", async () => {
        const onSaved = vi.fn();
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper, onSaved }));

        act(() => {
            result.current.save();
        });



        await waitFor(() => {
            expect(result.current.status).toBe("done");
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith("/api/archive", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ paper: mockPaper })
        }));
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBeNull();
    });

    it("should do nothing after save status is done", async () => {
        const onSaved = vi.fn();
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper, onSaved }));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("done");
        });

        vi.mocked(fetch).mockClear();
        onSaved.mockClear();

        act(() => {
            result.current.save();
        });

        expect(fetch).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
        expect(result.current.status).toBe("done");
    });

    it("should resolve paper using doi if paper is not provided", async () => {
        const onSaved = vi.fn();

        // Mock resolve response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ paper: mockPaper }),
        } as Response);

        // Mock archive response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test", onSaved }));

        act(() => {
            result.current.save();
        });



        await waitFor(() => {
            expect(result.current.status).toBe("done");
        });

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1, "/api/resolve", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ doi: "10.1234/test" })
        }));
        expect(fetch).toHaveBeenNthCalledWith(2, "/api/archive", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ paper: mockPaper })
        }));
        expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it("should resolve paper using title if paper and doi are not provided", async () => {
        const onSaved = vi.fn();

        // Mock resolve response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ paper: mockPaper }),
        } as Response);

        // Mock archive response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ title: "Test Paper Title", onSaved }));

        act(() => {
            result.current.save();
        });



        await waitFor(() => {
            expect(result.current.status).toBe("done");
        });

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1, "/api/resolve", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ title: "Test Paper Title" })
        }));
        expect(fetch).toHaveBeenNthCalledWith(2, "/api/archive", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ paper: mockPaper })
        }));
        expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it("should handle error when no identifiers are provided", async () => {
        const { result } = renderHook(() => useSaveToNotion({}));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("error");
        });

        expect(fetch).not.toHaveBeenCalled();
        expect(result.current.error).toBe("保存対象の DOI またはタイトルが見つかりません");
    });

    it("should handle error when resolution fails", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Resolution error message" }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ doi: "invalid-doi" }));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("error");
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBe("Resolution error message");
    });

    it("should handle error when resolution returns no paper", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ paper: null }), // No paper in response
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ title: "Not found paper" }));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("error");
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBe("保存対象の論文を取得できませんでした");
    });

    it("should handle error when archive fails", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Archive error message" }),
        } as Response);

        const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper }));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("error");
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBe("Archive error message");
    });

    it("should handle unexpected errors during fetch", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("Network Error"));

        const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper }));

        act(() => {
            result.current.save();
        });

        await waitFor(() => {
            expect(result.current.status).toBe("error");
        });

        expect(result.current.error).toBe("Network Error");
    });
});
