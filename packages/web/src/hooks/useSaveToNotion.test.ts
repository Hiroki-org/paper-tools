// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveToNotion } from "./useSaveToNotion";
import type { S2Paper } from "@paper-tools/core";

describe("useSaveToNotion", () => {
  const mockPaper: S2Paper = {
    paperId: "test-paper-123",
    title: "Test Paper Title",
    abstract: "Test abstract",
    authors: [],
    year: 2024,
    venue: "Test",
    citationCount: 0,
    influentialCitationCount: 0,
    referenceCount: 0,
    externalIds: { DOI: "10.1234/test" },
    url: "http://example.com",
    tldr: null,
    fieldsOfStudy: null,
    publicationDate: null,
    journal: null,
  };

  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockOnSaved.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if already saved", async () => {
    const { result } = renderHook(() =>
      useSaveToNotion({ paper: mockPaper, saved: true, onSaved: mockOnSaved })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("should successfully save when paper is provided (skips resolve)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() =>
      useSaveToNotion({ paper: mockPaper, onSaved: mockOnSaved })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/archive", expect.any(Object));
    expect(result.current.status).toBe("done");
    expect(mockOnSaved).toHaveBeenCalledTimes(1);
  });

  it("should resolve by DOI and then save", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paper: mockPaper }),
      } as Response) // /api/resolve
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response); // /api/archive

    const { result } = renderHook(() =>
      useSaveToNotion({ doi: "10.1234/test", onSaved: mockOnSaved })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/resolve",
      expect.objectContaining({
        body: JSON.stringify({ doi: "10.1234/test" }),
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/archive",
      expect.objectContaining({
        body: JSON.stringify({ paper: mockPaper }),
      })
    );
    expect(result.current.status).toBe("done");
    expect(mockOnSaved).toHaveBeenCalledTimes(1);
  });

  it("should resolve by title and then save", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paper: mockPaper }),
      } as Response) // /api/resolve
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response); // /api/archive

    const { result } = renderHook(() =>
      useSaveToNotion({ title: "Test Paper Title", onSaved: mockOnSaved })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/resolve",
      expect.objectContaining({
        body: JSON.stringify({ title: "Test Paper Title" }),
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/archive",
      expect.objectContaining({
        body: JSON.stringify({ paper: mockPaper }),
      })
    );
    expect(result.current.status).toBe("done");
    expect(mockOnSaved).toHaveBeenCalledTimes(1);
  });

  it("should set error when no paper, doi, or title provided", async () => {
    const { result } = renderHook(() => useSaveToNotion({}));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("保存対象の DOI またはタイトルが見つかりません");
  });

  it("should set error when resolve API fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Custom resolve error" }),
    } as Response);

    const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Custom resolve error");
  });

  it("should set default error when resolve API fails without error message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // missing error
    } as Response);

    const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("論文の解決に失敗しました");
  });

  it("should set error when resolve API returns ok but no paper", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // no paper
    } as Response);

    const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("保存対象の論文を取得できませんでした");
  });

  it("should set error when archive API fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paper: mockPaper }),
      } as Response) // /api/resolve
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Custom archive error" }),
      } as Response); // /api/archive

    const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Custom archive error");
  });

  it("should set default error when archive API fails without error message", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paper: mockPaper }),
      } as Response) // /api/resolve
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no error message
      } as Response); // /api/archive

    const { result } = renderHook(() => useSaveToNotion({ doi: "10.1234/test" }));

    await act(async () => {
      await result.current.save();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Notionへの保存に失敗しました");
  });

  it("should handle general network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useSaveToNotion({ paper: mockPaper }));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network Error");
  });
});
