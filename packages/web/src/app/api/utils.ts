export function parseSearchParams(
	request:
		| Request
		| { url: string; nextUrl?: { searchParams: URLSearchParams } },
) {
	if ("nextUrl" in request && request.nextUrl) {
		return request.nextUrl.searchParams as URLSearchParams;
	}
	return new URL(request.url).searchParams;
}

export function parseLimitParam(
	searchParams: URLSearchParams,
	defaultLimit = 10,
	maxLimit = 20,
	paramName = "limit",
) {
	const rawLimit = Number(
		searchParams.get(paramName) ?? defaultLimit.toString(),
	);
	return Number.isFinite(rawLimit)
		? Math.max(1, Math.min(maxLimit, rawLimit))
		: defaultLimit;
}
