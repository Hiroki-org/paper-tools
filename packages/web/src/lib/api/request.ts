import type { NextRequest } from "next/server";

/**
 * Extracts URLSearchParams from a NextRequest safely using nextUrl
 */
export function getSearchParams(request: NextRequest): URLSearchParams {
	return request.nextUrl.searchParams;
}

/**
 * Parses a numeric search parameter with bounds checking
 */
export function parseNumericParam(
	params: URLSearchParams,
	key: string,
	defaultValue: number,
	min?: number,
	max?: number,
): number {
	const raw = params.get(key);
	if (raw === null || raw.trim() === "") return defaultValue;

	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return defaultValue;

	let result = parsed;
	if (min !== undefined) result = Math.max(min, result);
	if (max !== undefined) result = Math.min(max, result);
	return result;
}

/**
 * Parses a string search parameter and trims whitespace
 */
export function parseStringParam(
	params: URLSearchParams,
	key: string,
	defaultValue: string = "",
): string {
	return params.get(key)?.trim() ?? defaultValue;
}
