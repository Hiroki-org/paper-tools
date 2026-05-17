import type { NextRequest } from "next/server";

export function getSearchParams(request: NextRequest) {
	return new URL(request.url).searchParams;
}

export function parseLimit(
	searchParams: URLSearchParams,
	key: string = "limit",
	defaultLimit: number = 10,
	minLimit: number = 1,
	maxLimit: number = 20,
) {
	const rawValue = searchParams.get(key);
	const parsedValue = Number(rawValue ?? defaultLimit);
	return Number.isFinite(parsedValue)
		? Math.max(minLimit, Math.min(maxLimit, parsedValue))
		: defaultLimit;
}

export function getQueryParam(
	searchParams: URLSearchParams,
	key: string = "q",
) {
	return searchParams.get(key)?.trim() ?? "";
}
