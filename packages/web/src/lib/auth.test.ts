import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sealCookieValue, unsealCookieValue, clearAuthCookies } from "./auth";
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
            const [payload, sig] = sealed.split(".");
            const tampered = `${payload}.invalid-signature`;

            const unsealed = unsealCookieValue(tampered);
            expect(unsealed).toBeNull();
        });

        it("should return null for malformed cookie value", () => {
            expect(unsealCookieValue("not-a-valid-format")).toBeNull();
            expect(unsealCookieValue("")).toBeNull();
        });

        it("should return null if payload is valid base64url but invalid json", () => {
            // Encode invalid JSON
            const invalidJsonPayload = Buffer.from("not json", "utf8").toString("base64url");

            // We need to sign this invalid json payload so the signature check passes
            // but the JSON.parse fails.
            // Since we can't easily import the internal signPayload, we'll manually sign it.
            const crypto = require("crypto");
            const sig = crypto.createHmac("sha256", "super-secret-key-12345").update(invalidJsonPayload).digest("base64url");

            const tampered = `${invalidJsonPayload}.${sig}`;
            const unsealed = unsealCookieValue(tampered);
            expect(unsealed).toBeNull();
        });

        it("should throw error if secret is missing", () => {
            vi.unstubAllEnvs();
            // Delete both secrets explicitly just in case stubEnv isn't enough when variable is empty string
            // `??` checks for null/undefined, so if we mock as empty string, it might still evaluate to empty string.
            // Wait, actually `??` only checks for null/undefined. If `process.env.COOKIE_SECRET` is `""`, `secret` is `""`.
            // Then `!secret` is true, so it throws. That part works.
            vi.stubEnv("COOKIE_SECRET", "");
            vi.stubEnv("NEXTAUTH_SECRET", "");

            expect(() => sealCookieValue({ test: true })).toThrow("COOKIE_SECRET (or NEXTAUTH_SECRET) is not set");
        });

        it("should use NEXTAUTH_SECRET if COOKIE_SECRET is missing", () => {
            vi.unstubAllEnvs();
            // In Node, if process.env.COOKIE_SECRET doesn't exist, it's undefined.
            // vi.stubEnv with undefined doesn't remove it in all versions of vitest,
            // but using delete process.env works. Or just unstubbing and not setting it.
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

            expect(mockResponse.cookies.set).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "", expect.objectContaining({
                secure: true,
            }));
        });
    });

});
