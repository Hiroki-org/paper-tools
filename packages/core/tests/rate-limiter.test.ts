import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, RateLimiter } from "../src/rate-limiter.js";

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
		p2.then(() => {
			completed = true;
		});

		// Advance time halfway through the refill period
		await vi.advanceTimersByTimeAsync(100);
		expect(completed).toBe(false);

		// Advance time to complete the refill period
		await vi.advanceTimersByTimeAsync(110); // Total > 200ms to be sure

		await expect(p2).resolves.toBeUndefined();
	});

	it("should handle concurrent acquire calls correctly (processQueue early return)", async () => {
		const limiter = new RateLimiter(1, 200);
		await limiter.acquire(); // Consume the 1 available token

		// Next acquire will block, setting processing = true
		const p2 = limiter.acquire();

		// Next acquire will trigger processQueue which hits the early return (processing is true)
		const p3 = limiter.acquire();

		let p2Completed = false;
		let p3Completed = false;
		p2.then(() => {
			p2Completed = true;
		});
		p3.then(() => {
			p3Completed = true;
		});

		await vi.advanceTimersByTimeAsync(100);
		expect(p2Completed).toBe(false);
		expect(p3Completed).toBe(false);

		// First refill allows p2 to resolve
		await vi.advanceTimersByTimeAsync(110);
		expect(p2Completed).toBe(true);
		expect(p3Completed).toBe(false);

		// Second refill allows p3 to resolve
		await vi.advanceTimersByTimeAsync(200);
		expect(p3Completed).toBe(true);

		await expect(p2).resolves.toBeUndefined();
		await expect(p3).resolves.toBeUndefined();
	});
});

describe("fetchWithRetry", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
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

	it("handles non-Error thrown during fetch correctly", async () => {
		const fetchMock = vi.mocked(globalThis.fetch);
		fetchMock.mockRejectedValueOnce("String error not Error instance");

		const successResponse = new Response("ok", {
			status: 200,
			statusText: "OK",
		});
		fetchMock.mockResolvedValueOnce(successResponse);

		const result = await fetchWithRetry("https://example.com", {}, 1, 1);
		expect(result).toBe(successResponse);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("throws correctly after exhausting retries with network error", async () => {
		const fetchMock = vi.mocked(globalThis.fetch);
		fetchMock.mockRejectedValue(new Error("Network failure"));

		await expect(
			fetchWithRetry("https://example.com", {}, 1, 1),
		).rejects.toThrow("Network failure");
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

	it("throws fallback error when retries is negative", async () => {
		await expect(fetchWithRetry("https://example.com", {}, -1)).rejects.toThrow(
			"fetchWithRetry failed without response: https://example.com",
		);
	});
});
