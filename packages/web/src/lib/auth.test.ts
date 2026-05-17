import type { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildNotionRedirectUri,
	clearAuthCookies,
	getAccessToken,
	sealCookieValue,
	setAuthCookies,
	unsealCookieValue,
    getRefreshToken,
    getSelectedDatabaseId,
    isAuthenticated,
    getNotionClient,
    getUserInfo,
    setDatabaseCookie,
    setOauthStateCookie,
    createStateToken
} from "./auth";
import {
	ACCESS_TOKEN_COOKIE,
	DATABASE_ID_COOKIE,
	OAUTH_STATE_COOKIE,
	REFRESH_TOKEN_COOKIE,
	USER_INFO_COOKIE,
} from "./auth-cookies";

describe("auth", () => {
	describe("sealCookieValue and unsealCookieValue", () => {
		beforeEach(() => {
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should successfully seal and unseal data", () => {
			const data = { userId: "user-123", role: "admin" };
			const sealed = sealCookieValue(data);

			expect(typeof sealed).toBe("string");
			expect(sealed).toContain(".");

			const unsealed = unsealCookieValue<{ userId: string; role: string }>(
				sealed,
			);
			expect(unsealed).toEqual(data);
		});

		it("should return null for invalid signature", () => {
			const data = { test: true };
			const sealed = sealCookieValue(data);

			// Modify the signature part
			const [payload] = sealed.split(".");
			const tampered = `${payload}.invalid-signature`;

			const unsealed = unsealCookieValue(tampered);
			expect(unsealed).toBeNull();
		});

		it("should return null for malformed cookie value", () => {
			expect(unsealCookieValue("not-a-valid-format")).toBeNull();
			expect(unsealCookieValue("")).toBeNull();
		});

		it("should return null if payload is valid base64url but invalid json", () => {
			const invalidJsonPayload = Buffer.from("not json", "utf8").toString(
				"base64url",
			);
			const crypto = require("crypto");
			const sig = crypto
				.createHmac("sha256", "super-secret-key-12345")
				.update(invalidJsonPayload)
				.digest("base64url");

			const tampered = `${invalidJsonPayload}.${sig}`;
			const unsealed = unsealCookieValue(tampered);
			expect(unsealed).toBeNull();
		});

		it("should throw error if secret is missing", () => {
			vi.unstubAllEnvs();
			vi.stubEnv("COOKIE_SECRET", "");
			vi.stubEnv("NEXTAUTH_SECRET", "");

			expect(() => sealCookieValue({ test: true })).toThrow(
				"COOKIE_SECRET (or NEXTAUTH_SECRET) is not set",
			);
		});

		it("should use NEXTAUTH_SECRET if COOKIE_SECRET is missing", () => {
			vi.unstubAllEnvs();
			delete process.env.COOKIE_SECRET;
			vi.stubEnv("NEXTAUTH_SECRET", "next-auth-secret-456");

			const data = { auth: true };
			const sealed = sealCookieValue(data);
			const unsealed = unsealCookieValue(sealed);
			expect(unsealed).toEqual(data);
		});
	});

	describe("setAuthCookies", () => {
		let mockResponse: any;

		beforeEach(() => {
			mockResponse = {
				cookies: {
					set: vi.fn(),
				},
			};
			vi.stubEnv("NODE_ENV", "development"); // to make isSecureRequest predictable
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.restoreAllMocks();
			vi.unstubAllEnvs();
		});

		it("should set access and refresh token cookies with correct options", () => {
			setAuthCookies(mockResponse, {
				accessToken: "access-123",
				refreshToken: "refresh-456",
			});

			expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2);

			expect(mockResponse.cookies.set).toHaveBeenNthCalledWith(
				1,
				ACCESS_TOKEN_COOKIE,
				expect.any(String),
				{
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 3600,
				},
			);

			expect(mockResponse.cookies.set).toHaveBeenNthCalledWith(
				2,
				REFRESH_TOKEN_COOKIE,
				expect.any(String),
				{
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 2592000,
				},
			);
		});

		it("should also set user info cookie if userInfo is provided", () => {
			const userInfo = {
				name: "Test User",
				workspaceName: "Test WS",
				workspaceIcon: "icon",
			};
			setAuthCookies(mockResponse, {
				accessToken: "access-123",
				refreshToken: "refresh-456",
				userInfo,
			});

			expect(mockResponse.cookies.set).toHaveBeenCalledTimes(3);

			expect(mockResponse.cookies.set).toHaveBeenNthCalledWith(
				3,
				USER_INFO_COOKIE,
				expect.any(String),
				{
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 2592000,
				},
			);
		});

		it("should use secure cookies if request specifies https", () => {
			const request = {
				headers: new Headers([["x-forwarded-proto", "https"]]),
			};
			setAuthCookies(mockResponse, {
				accessToken: "access-123",
				refreshToken: "refresh-456",
				request,
			});

			expect(mockResponse.cookies.set).toHaveBeenNthCalledWith(
				1,
				ACCESS_TOKEN_COOKIE,
				expect.any(String),
				{
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 3600,
				},
			);
		});
	});

	describe("buildNotionRedirectUri", () => {
		it("should return https when request uses x-forwarded-proto as https", () => {
			const request = {
				headers: new Headers([
					["x-forwarded-proto", "https"],
					["host", "example.com"],
				]),
			};
			expect(buildNotionRedirectUri(request)).toBe(
				"https://example.com/api/auth/callback/notion",
			);
		});

		it("should default to http for localhost when no x-forwarded-proto is provided", () => {
			const request = {
				headers: new Headers([["host", "localhost:3000"]]),
			};
			expect(buildNotionRedirectUri(request)).toBe(
				"http://localhost:3000/api/auth/callback/notion",
			);
		});

		it("should default to https for non-localhost when no x-forwarded-proto is provided", () => {
			const request = {
				headers: new Headers([["host", "example.com"]]),
			};
			expect(buildNotionRedirectUri(request)).toBe(
				"https://example.com/api/auth/callback/notion",
			);
		});

		it("should prioritize x-forwarded-host over host", () => {
			const request = {
				headers: new Headers([
					["x-forwarded-host", "forwarded.com"],
					["host", "example.com"],
				]),
			};
			expect(buildNotionRedirectUri(request)).toBe(
				"https://forwarded.com/api/auth/callback/notion",
			);
		});

		it("should fallback to localhost:3000 if no host or x-forwarded-host is provided", () => {
			const request = {
				headers: new Headers(),
			};
			expect(buildNotionRedirectUri(request)).toBe(
				"http://localhost:3000/api/auth/callback/notion",
			);
		});
	});

	describe("clearAuthCookies", () => {
		let mockResponse: any;

		beforeEach(() => {
			mockResponse = {
				cookies: {
					set: vi.fn(),
				},
			};
		});

		afterEach(() => {
			vi.unstubAllEnvs();
			vi.restoreAllMocks();
		});

		it("should clear all auth cookies with correct options in development", () => {
			vi.stubEnv("NODE_ENV", "development");

			clearAuthCookies(mockResponse as NextResponse);

			const expectedCookies = [
				ACCESS_TOKEN_COOKIE,
				REFRESH_TOKEN_COOKIE,
				USER_INFO_COOKIE,
				DATABASE_ID_COOKIE,
				OAUTH_STATE_COOKIE,
			];

			expect(mockResponse.cookies.set).toHaveBeenCalledTimes(5);

			expectedCookies.forEach((cookieName) => {
				expect(mockResponse.cookies.set).toHaveBeenCalledWith(cookieName, "", {
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 0,
				});
			});
		});

		it("should set secure flag to true in production", () => {
			vi.stubEnv("NODE_ENV", "production");

			clearAuthCookies(mockResponse as NextResponse);

			const expectedCookies = [
				ACCESS_TOKEN_COOKIE,
				REFRESH_TOKEN_COOKIE,
				USER_INFO_COOKIE,
				DATABASE_ID_COOKIE,
				OAUTH_STATE_COOKIE,
			];

			expect(mockResponse.cookies.set).toHaveBeenCalledTimes(5);

			expectedCookies.forEach((cookieName) => {
				expect(mockResponse.cookies.set).toHaveBeenCalledWith(cookieName, "", {
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 0,
				});
			});
		});
	});

	describe("getRefreshToken", () => {
		beforeEach(() => {
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should return null if cookie is not present", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue(undefined),
			};
			expect(getRefreshToken(cookieStore as any)).toBeNull();
		});

		it("should return the token when valid cookie is present", () => {
			const token = "refresh-token-123";
			const sealed = sealCookieValue({ token });
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};

			expect(getRefreshToken(cookieStore as any)).toBe(token);
		});

		it("should return null when the cookie is valid but contains no token", () => {
			const sealed = sealCookieValue({ notToken: "abc" } as any);
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};
			expect(getRefreshToken(cookieStore as any)).toBeNull();
		});
	});

	describe("getSelectedDatabaseId", () => {
		it("should return null if cookie is not present", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue(undefined),
			};
			expect(getSelectedDatabaseId(cookieStore as any)).toBeNull();
		});

		it("should return the database id when cookie is present", () => {
			const dbId = "db-123";
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: dbId }),
			};

			expect(getSelectedDatabaseId(cookieStore as any)).toBe(dbId);
		});
	});

	describe("isAuthenticated", () => {
		beforeEach(() => {
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should return false if access token is not present", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue(undefined),
			};
			expect(isAuthenticated(cookieStore as any)).toBe(false);
		});

		it("should return true if access token is present", () => {
			const token = "valid-token-123";
			const sealed = sealCookieValue({ token });
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};
			expect(isAuthenticated(cookieStore as any)).toBe(true);
		});
	});

	describe("getNotionClient", () => {
		it("should return a Notion client instance", () => {
			const client = getNotionClient("access-token-123");
			expect(client).toBeDefined();
		});
	});

	describe("getUserInfo", () => {
		beforeEach(() => {
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should return null if cookie is not present", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue(undefined),
			};
			expect(getUserInfo(cookieStore as any)).toBeNull();
		});

		it("should return the user info when valid cookie is present", () => {
			const userInfo = {
				name: "Test User",
				workspaceName: "Test WS",
				workspaceIcon: "icon",
			};
			const sealed = sealCookieValue(userInfo);
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};

			expect(getUserInfo(cookieStore as any)).toEqual(userInfo);
		});
	});

	describe("setDatabaseCookie specific options tests", () => {
		let mockResponse: any;

		beforeEach(() => {
			mockResponse = {
				cookies: {
					set: vi.fn(),
				},
			};
		});

		it("should correctly set database cookie with default secure option based on NODE_ENV", () => {
			vi.stubEnv("NODE_ENV", "production");
			setDatabaseCookie(mockResponse, "db-123");
			expect(mockResponse.cookies.set).toHaveBeenCalledWith(
				DATABASE_ID_COOKIE,
				"db-123",
				{
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 2592000,
				},
			);
			vi.unstubAllEnvs();
		});

		it("should correctly set database cookie with default secure option false based on NODE_ENV", () => {
			vi.stubEnv("NODE_ENV", "development");
			setDatabaseCookie(mockResponse, "db-123");
			expect(mockResponse.cookies.set).toHaveBeenCalledWith(
				DATABASE_ID_COOKIE,
				"db-123",
				{
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 2592000,
				},
			);
			vi.unstubAllEnvs();
		});
	});

	describe("setOauthStateCookie specific options tests", () => {
		let mockResponse: any;

		beforeEach(() => {
			mockResponse = {
				cookies: {
					set: vi.fn(),
				},
			};
		});

		it("should correctly set oauth state cookie with explicit secure false based on NODE_ENV development fallback", () => {
			vi.stubEnv("NODE_ENV", "development");
			setOauthStateCookie(mockResponse, "state-123", undefined as any);
			expect(mockResponse.cookies.set).toHaveBeenCalledWith(
				OAUTH_STATE_COOKIE,
				"state-123",
				{
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 600,
				},
			);
			vi.unstubAllEnvs();
		});

		it("should correctly set oauth state cookie with explicit secure true based on NODE_ENV production fallback", () => {
			vi.stubEnv("NODE_ENV", "production");
			setOauthStateCookie(mockResponse, "state-123", undefined as any);
			expect(mockResponse.cookies.set).toHaveBeenCalledWith(
				OAUTH_STATE_COOKIE,
				"state-123",
				{
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 600,
				},
			);
			vi.unstubAllEnvs();
		});
	});

	describe("createStateToken", () => {
		it("should generate a 32 character hex string", () => {
			const token = createStateToken();
			expect(typeof token).toBe("string");
			expect(token.length).toBe(32);
		});
	});

	describe("getAccessToken", () => {
		beforeEach(() => {
			vi.stubEnv("COOKIE_SECRET", "super-secret-key-12345");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should return null if cookie is not present", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue(undefined),
			};
			expect(getAccessToken(cookieStore as any)).toBeNull();
			expect(cookieStore.get).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
		});

		it("should return the token when valid cookie is present", () => {
			const token = "valid-token-123";
			const sealed = sealCookieValue({ token });
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};

			expect(getAccessToken(cookieStore as any)).toBe(token);
		});

		it("should return null when the cookie is malformed or invalid", () => {
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: "invalid.cookie.value" }),
			};
			expect(getAccessToken(cookieStore as any)).toBeNull();
		});

		it("should return null when the cookie is valid but contains no token", () => {
			const sealed = sealCookieValue({ notToken: "abc" } as any);
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};
			expect(getAccessToken(cookieStore as any)).toBeNull();
		});

		it("should return null when the cookie is valid but contains a non-string token", () => {
			const sealed = sealCookieValue({ token: 12345 } as any);
			const cookieStore = {
				get: vi.fn().mockReturnValue({ value: sealed }),
			};
			expect(getAccessToken(cookieStore as any)).toBeNull();
		});
	});
});
