// @vitest-environment jsdom

import type { S2Paper } from "@paper-tools/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveToNotion } from "./useSaveToNotion";

describe("useSaveToNotion", () => {
	const mockPaper: S2Paper = {
		paperId: "test-id",
		title: "Test Paper",
		abstract: "Test Abstract",
		year: 2024,
		authors: [{ authorId: "author-1", name: "Test Author" }],
		url: "https://example.com/paper",
		referenceCount: 0,
		citationCount: 0,
		influentialCitationCount: 0,
		externalIds: {},
	};

	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should initialize with idle status and null error", () => {
		const { result } = renderHook(() => useSaveToNotion({}));
		expect(result.current.status).toBe("idle");
		expect(result.current.error).toBeNull();
	});

	it("should return early if already saved", async () => {
		const { result } = renderHook(() => useSaveToNotion({ saved: true }));

		await act(async () => {
			await result.current.save();
		});

		expect(result.current.status).toBe("idle");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("should return early if status is resolving, saving, or done", async () => {
		// Mock fetch to delay so we can check state mid-flight
		vi.mocked(fetch).mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(resolve, 100)),
		);

		const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper }));

		act(() => {
			result.current.save();
		});

		expect(result.current.status).toBe("saving");

		// Call save again while saving
		act(() => {
			result.current.save();
		});

		// Should only have been called once
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("should throw error if paper, doi, and title are missing", async () => {
		const { result } = renderHook(() => useSaveToNotion({}));

		await act(async () => {
			await result.current.save();
		});

		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe(
			"保存対象の DOI またはタイトルが見つかりません",
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	describe("when providing paper", () => {
		it("should skip resolve and archive directly on success", async () => {
			const onSavedMock = vi.fn();
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ paper: mockPaper, onSaved: onSavedMock }),
			);

			act(() => {
				result.current.save();
			});

			expect(result.current.status).toBe("saving");

			await waitFor(() => {
				expect(result.current.status).toBe("done");
			});

			expect(result.current.error).toBeNull();
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith("/api/archive", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ paper: mockPaper }),
			});
			expect(onSavedMock).toHaveBeenCalled();
		});

		it("should handle archive failure", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "Notion API Error" }),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ paper: mockPaper }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("Notion API Error");
		});

		it("should handle archive failure with default error message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({}),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ paper: mockPaper }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("Notionへの保存に失敗しました");
		});
	});

	describe("when providing doi or title without paper", () => {
		it("should resolve paper and then archive on success", async () => {
			const onSavedMock = vi.fn();

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

			const { result } = renderHook(() =>
				useSaveToNotion({ doi: "10.1234/test", onSaved: onSavedMock }),
			);

			act(() => {
				result.current.save();
			});

			expect(result.current.status).toBe("resolving");

			await waitFor(() => {
				expect(result.current.status).toBe("done");
			});

			expect(fetch).toHaveBeenCalledTimes(2);

			// Check resolve call
			expect(fetch).toHaveBeenNthCalledWith(1, "/api/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ doi: "10.1234/test" }),
			});

			// Check archive call
			expect(fetch).toHaveBeenNthCalledWith(2, "/api/archive", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ paper: mockPaper }),
			});

			expect(onSavedMock).toHaveBeenCalled();
		});

		it("should resolve paper with title if doi is not provided", async () => {
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

			const { result } = renderHook(() =>
				useSaveToNotion({ title: "Test Paper Title" }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(fetch).toHaveBeenNthCalledWith(1, "/api/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Test Paper Title" }),
			});
		});

		it("should trim doi and title", async () => {
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

			const { result } = renderHook(() =>
				useSaveToNotion({ doi: "  10.1234/test  " }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(fetch).toHaveBeenNthCalledWith(1, "/api/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ doi: "10.1234/test" }),
			});
		});

		it("should handle resolve failure", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "Resolve Error" }),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ doi: "10.1234/test" }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("Resolve Error");
			expect(fetch).toHaveBeenCalledTimes(1); // Should not call archive
		});

		it("should handle resolve failure with default error message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({}),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ doi: "10.1234/test" }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("論文の解決に失敗しました");
		});

		it("should handle resolve success but missing paper", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ paper: null }),
			} as Response);

			const { result } = renderHook(() =>
				useSaveToNotion({ doi: "10.1234/test" }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("保存対象の論文を取得できませんでした");
		});

		it("should handle unknown error", async () => {
			vi.mocked(fetch).mockRejectedValueOnce("Unknown primitive error");

			const { result } = renderHook(() =>
				useSaveToNotion({ paper: mockPaper }),
			);

			await act(async () => {
				await result.current.save();
			});

			expect(result.current.status).toBe("error");
			expect(result.current.error).toBe("Unknown error");
		});
	});
});
