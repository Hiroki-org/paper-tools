import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PaperDetail } from "@/types/paper";

vi.mock("@paper-tools/core", () => ({
    RateLimiter: class {
        async acquire() {
            return;
        }
    },
    getPaper: vi.fn(),
}));

const core = await import("@paper-tools/core");
const { GET } = await import("./route");

function ctx(paperId: string) {
    return { params: Promise.resolve({ paperId }) } as { params: Promise<{ paperId: string }> };
}

describe("/api/paper/[paperId] GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("paper detail を返す", async () => {
        vi.mocked(core.getPaper).mockResolvedValueOnce({
            paperId: "abc",
            title: "Paper",
            abstract: "Abstract",
            authors: [{ authorId: "a1", name: "Alice" }],
            year: 2024,
            venue: "ICSE",
            citationCount: 10,
            influentialCitationCount: 3,
            referenceCount: 20,
            externalIds: { DOI: "10.1/xyz", CorpusId: "123" },
            url: "https://www.semanticscholar.org/paper/abc",
            tldr: { model: "x", text: "summary" },
            fieldsOfStudy: [{ category: "Computer Science", source: "s2" }],
            publicationDate: "2024-01-01",
            journal: { name: "J", volume: "1", pages: "1-10" },
        } as unknown as any);

        const res = await GET(new NextRequest("http://localhost/api/paper/abc"), ctx("abc"));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(core.getPaper).toHaveBeenCalledWith(
            "abc",
            expect.stringContaining("influentialCitationCount"),
        );
        expect(data.paperId).toBe("abc");
        expect(data.externalIds.CorpusId).toBe(123);
    });

    it("paperId が空なら 400", async () => {
        const res = await GET(new NextRequest("http://localhost/api/paper"), ctx(""));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toContain("paperId");
    });

    it("上流404は 404 を返す", async () => {
        vi.mocked(core.getPaper).mockRejectedValueOnce(new Error("Semantic Scholar API error: 404 Not Found"));
        const res = await GET(new NextRequest("http://localhost/api/paper/unknown"), ctx("unknown"));
        expect(res.status).toBe(404);
    });
});
