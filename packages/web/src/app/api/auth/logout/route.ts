import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearAuthCookies(response);
  return response;
}
