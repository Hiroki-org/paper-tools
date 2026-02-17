import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

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
