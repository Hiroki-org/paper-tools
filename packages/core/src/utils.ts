/**
 * 文字列を正の整数にパースする
 * CLIオプションのバリデーションなどに使用される
 *
 * @param value - パース対象の文字列
 * @param optionName - エラーメッセージに含めるオプション名（または Commander から渡される previous value）
 * @returns パースされた正の整数
 * @throws 値が正の整数でない場合は Error をスロー
 */
export function parsePositiveInt(value: string, optionName?: unknown): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
        const prefix = typeof optionName === "string" ? `${optionName} には` : "";
        throw new Error(`${prefix}正の整数を指定してください: ${value}`);
    }
    return parsed;
}


/**
 * Executes an async function over an array with limited concurrency.
 * @param items The array of items to process.
 * @param mapper The async function to execute for each item.
 * @param concurrencyLimit The maximum number of concurrent executions.
 * @returns A promise that resolves to an array of results.
 */
export async function mapWithConcurrency<T, R>(
    items: T[],
    mapper: (item: T) => Promise<R>,
    concurrencyLimit: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    const workers = Array.from({ length: Math.min(concurrencyLimit, items.length) }, async () => {
        while (index < items.length) {
            const currentIndex = index++;
            results[currentIndex] = await mapper(items[currentIndex]);
        }
    });

    await Promise.all(workers);
    return results;
}
