import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sealCookieValue, unsealCookieValue, clearAuthCookies, getAccessToken } from "./auth";
import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    USER_INFO_COOKIE,
    DATABASE_ID_COOKIE,
    OAUTH_STATE_COOKIE,
} from "./auth-cookies";
import { NextResponse } from "next/server";

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

            const unsealed = unsealCookieValue<{ userId: string; role: string }>(sealed);
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
            const invalidJsonPayload = Buffer.from("not json", "utf8").toString("base64url");
            const crypto = require("crypto");
            const sig = crypto.createHmac("sha256", "super-secret-key-12345").update(invalidJsonPayload).digest("base64url");

            const tampered = `${invalidJsonPayload}.${sig}`;
            const unsealed = unsealCookieValue(tampered);
            expect(unsealed).toBeNull();
        });

        it("should throw error if secret is missing", () => {
            vi.unstubAllEnvs();
            vi.stubEnv("COOKIE_SECRET", "");
            vi.stubEnv("NEXTAUTH_SECRET", "");

            expect(() => sealCookieValue({ test: true })).toThrow("COOKIE_SECRET (or NEXTAUTH_SECRET) is not set");
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
