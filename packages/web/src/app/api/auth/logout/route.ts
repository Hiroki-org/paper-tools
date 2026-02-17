import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

// Only POST is allowed to prevent CSRF attacks
export async function POST(request: NextRequest) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearAuthCookies(response);
    return response;
}
