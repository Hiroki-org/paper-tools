/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSavedPapers } from "./useSavedPapers";
import type { Paper } from "@paper-tools/core";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useSavedPapers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty saved papers and fetch archive", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [] }),
    } as any);

    let resultContainer;
    await act(async () => {
      resultContainer = renderHook(() => useSavedPapers());
      await Promise.resolve();
    });

    const { result } = resultContainer!;

    expect(mockFetch).toHaveBeenCalledWith("/api/archive");
    const paper: Paper = { id: "1", title: "Test Paper", doi: "10.1234/test", authors: [], abstract: "", year: 2024, url: "" };
    expect(result.current.isSaved(paper)).toBe(false);
  });

  it("should initialize saved papers from fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        records: [
          { doi: "10.1234/saved1", title: "Saved Paper 1" },
          { title: "Saved Paper 2" }
        ],
      }),
    } as any);

    let resultContainer;
    await act(async () => {
      resultContainer = renderHook(() => useSavedPapers());
      await Promise.resolve();
    });

    const { result } = resultContainer!;

    const paper1: Paper = { id: "1", title: "Saved Paper 1", doi: "10.1234/saved1", authors: [], abstract: "", year: 2024, url: "" };
    const paper2: Paper = { id: "2", title: "Saved Paper 2", doi: "", authors: [], abstract: "", year: 2024, url: "" };
    const paper3: Paper = { id: "3", title: "Not Saved", doi: "10.1234/notsaved", authors: [], abstract: "", year: 2024, url: "" };

    expect(result.current.isSaved(paper1)).toBe(true);
    expect(result.current.isSaved(paper2)).toBe(true);
    expect(result.current.isSaved(paper3)).toBe(false);
  });

  it("should allow marking a paper as saved", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [] }),
    } as any);

    let resultContainer;
    await act(async () => {
      resultContainer = renderHook(() => useSavedPapers());
      await Promise.resolve();
    });

    const { result } = resultContainer!;

    const paper: Paper = { id: "1", title: "New Paper", doi: "10.1234/new", authors: [], abstract: "", year: 2024, url: "" };

    expect(result.current.isSaved(paper)).toBe(false);

    act(() => {
      result.current.markSaved(paper);
    });

    expect(result.current.isSaved(paper)).toBe(true);
  });

  it("should handle fetch error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network Error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    let resultContainer;
    await act(async () => {
      resultContainer = renderHook(() => useSavedPapers());
      await Promise.resolve();
    });

    const { result } = resultContainer!;

    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch archive:", expect.any(Error));

    const paper: Paper = { id: "1", title: "Test", doi: "10.1234/test", authors: [], abstract: "", year: 2024, url: "" };
    expect(result.current.isSaved(paper)).toBe(false);

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
