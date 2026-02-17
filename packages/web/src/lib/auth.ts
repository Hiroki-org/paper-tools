import { createHmac, randomBytes } from "crypto";
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    USER_INFO_COOKIE,
    DATABASE_ID_COOKIE,
    OAUTH_STATE_COOKIE,
} from "@/lib/auth-cookies";

export {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    USER_INFO_COOKIE,
    DATABASE_ID_COOKIE,
    OAUTH_STATE_COOKIE,
};

type CookieStore = {
    get: (name: string) => { value: string } | undefined;
};

type UserInfo = {
    name?: string;
    workspaceName?: string;
    workspaceIcon?: string | null;
};

type RequestLike = {
    headers: Headers;
};

function getSecret() {
    const secret = process.env.COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("COOKIE_SECRET (or NEXTAUTH_SECRET) is not set");
    return secret;
}

function toBase64Url(input: string) {
    return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
    return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payload: string) {
    return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function sealCookieValue(data: unknown) {
    const payload = toBase64Url(JSON.stringify(data));
    const sig = signPayload(payload);
    return `${payload}.${sig}`;
}

export function unsealCookieValue<T>(value: string): T | null {
    const [payload, sig] = value.split(".");
    if (!payload || !sig) return null;
    if (signPayload(payload) !== sig) return null;
    try {
        return JSON.parse(fromBase64Url(payload)) as T;
    } catch {
        return null;
    }
}

export function createStateToken() {
    return randomBytes(16).toString("hex");
}

function isSecureRequest(request?: RequestLike) {
    if (request) {
        const forwardedProto = request.headers.get("x-forwarded-proto");
        if (forwardedProto) return forwardedProto === "https";
        const host = request.headers.get("host") ?? "";
        return !host.startsWith("localhost");
    }
    return process.env.NODE_ENV === "production";
}

export function buildNotionRedirectUri(request: RequestLike) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}/api/auth/callback/notion`;
}

export function getAccessToken(cookieStore: CookieStore): string | null {
    const raw = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!raw) return null;
    const parsed = unsealCookieValue<{ token: string }>(raw);
    return parsed?.token ?? null;
}

export function getRefreshToken(cookieStore: CookieStore): string | null {
    const raw = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!raw) return null;
    const parsed = unsealCookieValue<{ token: string }>(raw);
    return parsed?.token ?? null;
}

export function getSelectedDatabaseId(cookieStore: CookieStore): string | null {
    return cookieStore.get(DATABASE_ID_COOKIE)?.value ?? null;
}

export function isAuthenticated(cookieStore: CookieStore): boolean {
    return Boolean(getAccessToken(cookieStore));
}

export function getNotionClient(accessToken: string) {
    return new Client({ auth: accessToken });
}

export function getUserInfo(cookieStore: CookieStore): UserInfo | null {
    const raw = cookieStore.get(USER_INFO_COOKIE)?.value;
    if (!raw) return null;
    return unsealCookieValue<UserInfo>(raw);
}

export function setAuthCookies(
    response: NextResponse,
    payload: {
        accessToken: string;
        refreshToken: string;
        userInfo?: UserInfo;
        request?: RequestLike;
    },
) {
    const secure = isSecureRequest(payload.request);
    response.cookies.set(ACCESS_TOKEN_COOKIE, sealCookieValue({ token: payload.accessToken }), {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, sealCookieValue({ token: payload.refreshToken }), {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
    if (payload.userInfo) {
        response.cookies.set(USER_INFO_COOKIE, sealCookieValue(payload.userInfo), {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
        });
    }
}

export function setDatabaseCookie(response: NextResponse, databaseId: string, request?: RequestLike) {
    response.cookies.set(DATABASE_ID_COOKIE, databaseId, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}

export function setOauthStateCookie(response: NextResponse, state: string, request: RequestLike) {
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
    });
}

export function clearAuthCookies(response: NextResponse) {
    for (const name of [
        ACCESS_TOKEN_COOKIE,
        REFRESH_TOKEN_COOKIE,
        USER_INFO_COOKIE,
        DATABASE_ID_COOKIE,
        OAUTH_STATE_COOKIE,
    ]) {
        response.cookies.set(name, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });
    }
}
