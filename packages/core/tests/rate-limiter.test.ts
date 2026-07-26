import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter, fetchWithRetry } from "../src/rate-limiter.js";

describe("RateLimiter", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should allow requests within rate limit", async () => {
        const limiter = new RateLimiter(3, 100);
        // 3 requests should go through immediately
        const p1 = limiter.acquire();
        const p2 = limiter.acquire();
        const p3 = limiter.acquire();

        await expect(p1).resolves.toBeUndefined();
        await expect(p2).resolves.toBeUndefined();
        await expect(p3).resolves.toBeUndefined();
    });

    it("should throttle when rate limit exceeded", async () => {
        const limiter = new RateLimiter(1, 200);
        await limiter.acquire();

        const p2 = limiter.acquire();

        // p2 should be pending
        let completed = false;
        p2.then(() => { completed = true; });

        // Advance time halfway through the refill period
        await vi.advanceTimersByTimeAsync(100);
        expect(completed).toBe(false);

        // Advance time to complete the refill period
        await vi.advanceTimersByTimeAsync(110); // Total > 200ms to be sure

        await expect(p2).resolves.toBeUndefined();
    });


});

describe("fetchWithRetry", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("returns the final 429 response after exhausting retries", async () => {
        const response = new Response("slow down", {
            status: 429,
            statusText: "Too Many Requests",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithRetry("https://example.com", {}, 2, 1);

        expect(result).toBe(response);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("returns the final 5xx response after exhausting retries", async () => {
        const response = new Response("server error", {
            status: 503,
            statusText: "Service Unavailable",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithRetry("https://example.com", {}, 2, 1);

        expect(result).toBe(response);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("returns successful response immediately", async () => {
        const response = new Response("ok", {
            status: 200,
            statusText: "OK",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithRetry("https://example.com");

        expect(result).toBe(response);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns successful response after retrying a 5xx error", async () => {
        const errorResponse = new Response("server error", {
            status: 503,
            statusText: "Service Unavailable",
        });
        const successResponse = new Response("ok", {
            status: 200,
            statusText: "OK",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock
            .mockResolvedValueOnce(errorResponse)
            .mockResolvedValueOnce(successResponse);

        const result = await fetchWithRetry("https://example.com", {}, 2, 1);

        expect(result).toBe(successResponse);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns successful response after retrying a network error", async () => {
        const successResponse = new Response("ok", {
            status: 200,
            statusText: "OK",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce(successResponse);

        const result = await fetchWithRetry("https://example.com", {}, 2, 1);

        expect(result).toBe(successResponse);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns client error response immediately without retrying", async () => {
        const response = new Response("not found", {
            status: 404,
            statusText: "Not Found",
        });
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithRetry("https://example.com");

        expect(result).toBe(response);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("aborts the request and throws timeout error if timeout is specified and exceeded", async () => {
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockImplementation(async (url, init) => {
            return new Promise((resolve, reject) => {
                const signal = init?.signal;
                if (signal) {
                    if (signal.aborted) {
                        reject(signal.reason);
                        return;
                    }
                    signal.addEventListener("abort", () => {
                        reject(signal.reason);
                    });
                }
                setTimeout(() => {
                    resolve(new Response("ok"));
                }, 100);
            });
        });

        const promise = fetchWithRetry("https://example.com", { timeout: 10 }, 0, 1);
        await expect(promise).rejects.toThrow("Operation timed out");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("combines the timeout signal with an explicitly provided signal using AbortSignal.any", async () => {
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockImplementation(async (url, init) => {
            return new Promise((resolve, reject) => {
                const signal = init?.signal;
                if (signal) {
                    if (signal.aborted) {
                        reject(signal.reason);
                        return;
                    }
                    signal.addEventListener("abort", () => {
                        reject(signal.reason);
                    });
                }
                setTimeout(() => {
                    resolve(new Response("ok"));
                }, 100);
            });
        });

        const customController = new AbortController();
        const promise = fetchWithRetry("https://example.com", { timeout: 10, signal: customController.signal }, 0, 1);
        await expect(promise).rejects.toThrow("Operation timed out");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("clears timeout on error before retry to prevent leaks", async () => {
        const fetchMock = vi.mocked(globalThis.fetch);
        fetchMock.mockRejectedValue(new Error("Network Error"));

        const promise = fetchWithRetry("https://example.com", { timeout: 1000 }, 0, 1);
        await expect(promise).rejects.toThrow("Network Error");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
