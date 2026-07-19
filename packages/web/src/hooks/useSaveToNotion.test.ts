/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSaveToNotion } from "./useSaveToNotion";
import type { S2Paper } from "@paper-tools/core";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useSaveToNotion", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("initializes with idle status", () => {
		const { result } = renderHook(() => useSaveToNotion({}));
		expect(result.current.status).toBe("idle");
		expect(result.current.error).toBeNull();
	});

	it("does nothing if already saved", async () => {
		const { result } = renderHook(() => useSaveToNotion({ saved: true }));
		await act(async () => {
			await result.current.save();
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.current.status).toBe("idle");
	});

	it("saves paper directly if provided", async () => {
		const mockPaper = { paperId: "123", title: "Test Paper" } as S2Paper;
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const onSaved = vi.fn();
		const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper, onSaved }));

		await act(async () => {
			await result.current.save();
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith("/api/archive", expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ paper: mockPaper }),
		}));

		expect(result.current.status).toBe("done");
		expect(onSaved).toHaveBeenCalled();
	});

	it("resolves paper first if only doi is provided", async () => {
		const mockPaper = { paperId: "123", title: "Resolved Paper" } as S2Paper;

		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ paper: mockPaper }),
		});

		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

		await act(async () => {
			await result.current.save();
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/resolve", expect.objectContaining({
			body: JSON.stringify({ doi: "10.1234/test" }),
		}));
		expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/archive", expect.objectContaining({
			body: JSON.stringify({ paper: mockPaper }),
		}));

		expect(result.current.status).toBe("done");
	});

	it("handles resolve error", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: "Resolve failed" }),
		});

		const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

		await act(async () => {
			await result.current.save();
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe("Resolve failed");
	});

	it("handles archive error", async () => {
		const mockPaper = { paperId: "123", title: "Test Paper" } as S2Paper;
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: "Archive failed" }),
		});

		const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper }));

		await act(async () => {
			await result.current.save();
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe("Archive failed");
	});

	it("throws error if no paper, doi, or title is provided", async () => {
		const { result } = renderHook(() => useSaveToNotion({}));

		await act(async () => {
			await result.current.save();
		});

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe("保存対象の DOI またはタイトルが見つかりません");
	});
});
