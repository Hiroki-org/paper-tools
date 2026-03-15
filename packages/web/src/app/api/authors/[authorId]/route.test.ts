import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { type AuthorProfile } from "@paper-tools/core";

vi.mock("@paper-tools/author-profiler", () => ({
    buildAuthorProfile: vi.fn(),
}));

const profiler = await import("@paper-tools/author-profiler");
const { GET } = await import("./route");

describe("/api/authors/[authorId] GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns author profile", async () => {
        vi.mocked(profiler.buildAuthorProfile).mockResolvedValueOnce({
            id: "123",
            name: "Alice",
            affiliations: [{ name: "Example U" }],
            hIndex: 10,
            citationCount: 200,
            paperCount: 30,
            influentialCitationCount: 50,
            topPapers: [],
            coauthors: [],
            topicTimeline: [],
        } as Partial<AuthorProfile> as AuthorProfile);

        const req = new NextRequest("http://localhost/api/authors/123");
        const res = await GET(req, { params: { authorId: "123" } });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.id).toBe("123");
    });

    it("returns 400 when authorId is empty", async () => {
        const req = new NextRequest("http://localhost/api/authors/");
        const res = await GET(req, { params: { authorId: "" } });
        expect(res.status).toBe(400);
    });

    it("returns 404 only for Semantic Scholar 404 error format", async () => {
        vi.mocked(profiler.buildAuthorProfile).mockRejectedValueOnce(
            new Error("Semantic Scholar API error: 404 Not Found - missing"),
        );

        const req = new NextRequest("http://localhost/api/authors/unknown");
        const res = await GET(req, { params: { authorId: "unknown" } });
        expect(res.status).toBe(404);
    });

    it("returns 502 when message incidentally includes 404", async () => {
        vi.mocked(profiler.buildAuthorProfile).mockRejectedValueOnce(
            new Error("Topic score 0.404 failed validation"),
        );

        const req = new NextRequest("http://localhost/api/authors/unknown");
        const res = await GET(req, { params: { authorId: "unknown" } });
        expect(res.status).toBe(502);
    });
});
