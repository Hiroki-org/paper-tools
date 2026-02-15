import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

describe("RateLimiter", () => {
    it("should allow requests within rate limit", async () => {
        const limiter = new RateLimiter(3, 100);
        // 3 requests should go through immediately
        const start = Date.now();
        await limiter.acquire();
        await limiter.acquire();
        await limiter.acquire();
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(50);
    });

    it("should throttle when rate limit exceeded", async () => {
        const limiter = new RateLimiter(1, 200);
        await limiter.acquire();
        const start = Date.now();
        await limiter.acquire();
        const elapsed = Date.now() - start;
        // Should wait for refill
        expect(elapsed).toBeGreaterThanOrEqual(150);
    });
});
