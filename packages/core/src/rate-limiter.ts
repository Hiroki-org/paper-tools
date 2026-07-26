/**
 * シンプルなレート制限ユーティリティ
 * Token bucket アルゴリズムベース
 * キューイングメカニズムで競合状態を回避
 */
export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private queue: Array<() => void> = [];
    private processing = false;

    constructor(
        private readonly maxTokens: number,
        private readonly refillIntervalMs: number,
    ) {
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const refillUnits = Math.floor(elapsed / this.refillIntervalMs);
        const tokensToAdd = refillUnits * this.maxTokens;
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill += refillUnits * this.refillIntervalMs;
        }
    }

    async acquire(): Promise<void> {
        return new Promise((resolve) => {
            this.queue.push(resolve);
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;

        while (this.queue.length > 0) {
            this.refill();
            if (this.tokens > 0) {
                this.tokens--;
                const resolve = this.queue.shift()!;
                resolve();
            } else {
                // Wait until next refill
                const waitTime = this.refillIntervalMs - (Date.now() - this.lastRefill);
                await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitTime)));
            }
        }

        this.processing = false;
    }
}

/**
 * リトライ付きfetchラッパー
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit & { timeout?: number } = {},
    maxRetries = 3,
    baseDelayMs = 1000,
): Promise<Response> {
    const { timeout, ...fetchOptions } = options;

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let response: Response;
        let controller: AbortController | undefined;
        let timeoutId: NodeJS.Timeout | undefined;

        try {
            const init: RequestInit = { ...fetchOptions };

            if (timeout) {
                controller = new AbortController();
                init.signal = controller.signal;

                // Use AbortSignal.any if there's already a signal provided
                if (fetchOptions.signal) {
                    init.signal = AbortSignal.any([controller.signal, fetchOptions.signal]);
                }

                timeoutId = setTimeout(() => {
                    controller!.abort(new Error("Operation timed out"));
                }, timeout);
            }

            response = await fetch(url, init);
            if (timeoutId) clearTimeout(timeoutId);
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            // Network error — retry
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            continue;
        }

        if (response.ok) {
            return response;
        }
        // 429 / 5xx — retry, but return the final response when retries are exhausted
        if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            return response;
        }
        // Other client errors — return response instead of throwing so clients can handle it
        return response;
    }
    throw lastError ?? new Error(`fetchWithRetry failed without response: ${url}`);
}
