import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getNotionClient: vi.fn(),
    setDatabaseCookie: vi.fn(),
}));

import * as auth from "@/lib/auth";

describe("/api/databases/select POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when databaseId is missing from body", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValue("fake-token");

        const req = new NextRequest("http://localhost/api/databases/select", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const res = await POST(req);

        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe("databaseId is required");
    });
});
