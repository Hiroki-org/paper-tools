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
