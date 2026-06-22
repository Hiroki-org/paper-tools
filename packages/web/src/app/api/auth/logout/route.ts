import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/utils/url";

// Only POST is allowed to prevent CSRF attacks
export async function POST(_request: NextRequest) {
	const response = NextResponse.redirect(new URL("/login", getBaseUrl()), {
		status: 303,
	});
	clearAuthCookies(response);
	return response;
}
