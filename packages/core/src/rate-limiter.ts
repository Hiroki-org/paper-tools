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
        const tokensToAdd = Math.floor(elapsed / this.refillIntervalMs) * this.maxTokens;
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill = now;
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
    options: RequestInit = {},
    maxRetries = 3,
    baseDelayMs = 1000,
): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let response: Response;
        try {
            response = await fetch(url, options);
        } catch (error) {
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
        // 429 Too Many Requests — back off and retry
        if (response.status === 429) {
            const delay = baseDelayMs * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
        }
        // Other client errors — not retryable
        if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
        }
        // Server errors — retry
        lastError = new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
        if (attempt < maxRetries) {
            const delay = baseDelayMs * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
}
