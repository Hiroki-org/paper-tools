import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";
import { middleware } from "../../middleware";

vi.mock("next/server", () => {
	const redirectMock = vi.fn();
	const nextMock = vi.fn();
	const jsonMock = vi.fn();
	return {
		NextResponse: {
			redirect: redirectMock,
			next: nextMock,
			json: jsonMock,
		},
	};
});

describe("middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should parse cookie successfully", () => {
		const payload = Buffer.from(JSON.stringify({ token: "abc" })).toString(
			"base64",
		);
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					if (name === DATABASE_ID_COOKIE) return { value: "db" };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.next).toHaveBeenCalled();
	});

	it("should handle invalid cookie structure", () => {
		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: "invalid" };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});

	it("should handle null payload", () => {
		const payload = Buffer.from("null").toString("base64");
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});

	it("should handle token missing in payload", () => {
		const payload = Buffer.from(JSON.stringify({})).toString("base64");
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});

	it("should handle non-string token", () => {
		const payload = Buffer.from(JSON.stringify({ token: 123 })).toString(
			"base64",
		);
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});

	it("should handle empty string token", () => {
		const payload = Buffer.from(JSON.stringify({ token: "" })).toString(
			"base64",
		);
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});

	it("should handle invalid JSON", () => {
		const payload = Buffer.from("{invalid}").toString("base64");
		const cookie = `${payload}.signature`;

		const req = {
			nextUrl: { pathname: "/test" },
			url: "http://localhost:3000/test",
			cookies: {
				get: (name: string) => {
					if (name === ACCESS_TOKEN_COOKIE) return { value: cookie };
					return undefined;
				},
			},
		} as unknown as NextRequest;

		middleware(req);
		expect(NextResponse.redirect).toHaveBeenCalled();
	});
});
