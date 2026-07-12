/**
 * @vitest-environment jsdom
 */

import type { Paper } from "@paper-tools/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedPapers } from "./useSavedPapers";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useSavedPapers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should initialize empty and fetch archive correctly", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				records: [
					{ doi: "10.123/456", title: "Test Paper" },
					{ title: "No DOI Paper" },
				],
			}),
		});

		const { result } = renderHook(() => useSavedPapers());

		expect(mockFetch).toHaveBeenCalledWith("/api/archive");

		await waitFor(() => {
			expect(result.current.isSaved({ doi: "10.123/456" } as Paper)).toBe(true);
		});

		expect(result.current.isSaved({ title: "Test Paper" } as Paper)).toBe(true);
		expect(result.current.isSaved({ title: "No DOI Paper" } as Paper)).toBe(
			true,
		);
		expect(
			result.current.isSaved({ doi: "unknown", title: "unknown" } as Paper),
		).toBe(false);
	});

	it("should handle empty or malformed fetch responses gracefully", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ records: null }),
		});

		const { result } = renderHook(() => useSavedPapers());

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});

		expect(result.current.isSaved({ doi: "10.123/456" } as Paper)).toBe(false);
	});

	it("should mark paper as saved", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ records: [] }),
		});

		const { result } = renderHook(() => useSavedPapers());

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});

		const paper = { doi: "10.999/111", title: "New Paper" } as Paper;

		act(() => {
			result.current.markSaved(paper);
		});

		expect(result.current.isSaved(paper)).toBe(true);

		// Testing with only title
		const paperOnlyTitle = { title: "Title Only" } as Paper;
		act(() => {
			result.current.markSaved(paperOnlyTitle);
		});

		expect(result.current.isSaved(paperOnlyTitle)).toBe(true);
		expect(result.current.isSaved({ doi: "10.999/111" } as Paper)).toBe(true); // Should match by DOI
	});

	it("should handle failed fetch without throwing", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network Error"));

		const { result } = renderHook(() => useSavedPapers());

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});

		// Should still work for marking new papers
		const paper = { doi: "10.999/error", title: "Error Paper" } as Paper;
		act(() => {
			result.current.markSaved(paper);
		});
		expect(result.current.isSaved(paper)).toBe(true);
	});
});
