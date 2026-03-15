import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@paper-tools/core", () => ({
    searchAuthors: vi.fn(),
}));

const core = await import("@paper-tools/core");
const { GET } = await import("./route");

describe("/api/authors/search GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns author candidates", async () => {
        vi.mocked(core.searchAuthors).mockResolvedValueOnce({
            total: 1,
            offset: 0,
            data: [
                {
                    authorId: "123",
                    name: "Alice",
                    affiliations: ["Example University"],
                    paperCount: 10,
                    citationCount: 100,
                    hIndex: 8,
                },
            ],
        });

        const req = new NextRequest("http://localhost/api/authors/search?q=alice&limit=10");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.candidates[0].authorId).toBe("123");
    });

    it("returns 400 when q is missing", async () => {
        const req = new NextRequest("http://localhost/api/authors/search");
        const res = await GET(req);
        expect(res.status).toBe(400);
    });
});
