import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn().mockReturnValue("fake-token"),
}));

vi.mock("@paper-tools/core", () => ({
    RateLimiter: class {
        async acquire() {
            return;
        }
    },
}));

vi.mock("@paper-tools/bibtex/lib", () => ({
    fetchBibtex: vi.fn(),
    formatBibtex: vi.fn(),
    deriveBibtexKey: vi.fn(),
}));

const bibtex = await import("@paper-tools/bibtex/lib");
const { POST } = await import("./route");

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/bibtex/bulk", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
    });
}

describe("/api/bibtex/bulk POST", () => {
    beforeEach(async () => {


        const auth = await import("@/lib/auth");
        vi.mocked(auth.getAccessToken).mockReturnValue("fake-token");

        vi.clearAllMocks();
    });

    it("複数論文の BibTeX を結合して返す", async () => {
        vi.mocked(bibtex.fetchBibtex)
            .mockResolvedValueOnce({ bibtex: "@article{a,title={A}}", source: "crossref" } as any)
            .mockResolvedValueOnce({ bibtex: "@article{b,title={B}}", source: "dblp" } as any);
        vi.mocked(bibtex.deriveBibtexKey)
            .mockReturnValueOnce("a2024")
            .mockReturnValueOnce("b2024");
        vi.mocked(bibtex.formatBibtex)
            .mockReturnValueOnce({ formatted: "@article{a2024,title={A}}", warnings: [] } as any)
            .mockReturnValueOnce({ formatted: "@article{b2024,title={B}}", warnings: [] } as any);

        const req = makeRequest({ papers: [{ doi: "10.1/a", title: "A" }, { title: "B" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.count).toBe(2);
        expect(data.bibtex).toContain("@article{a2024");
        expect(data.bibtex).toContain("@article{b2024");
        expect(data.errors).toHaveLength(0);
    });

    it("papers が空なら 400", async () => {
        const req = makeRequest({ papers: [] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("papers");
    });

    it("個別失敗は errors に集約する", async () => {
        vi.mocked(bibtex.fetchBibtex).mockResolvedValueOnce(null as any);

        const req = makeRequest({ papers: [{ title: "Missing" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.count).toBe(0);
        expect(data.errors).toHaveLength(1);
    });

    it("認証情報がない場合は 401 を返す", async () => {
        const auth = await import("@/lib/auth");
        vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);

        const req = makeRequest({ papers: [{ title: "A" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("予期せぬエラーは 500 を返す", async () => {
        const auth = await import("@/lib/auth");
        vi.mocked(auth.getAccessToken).mockImplementation(() => {
            throw new Error("Unexpected auth error");
        });

        const req = makeRequest({ papers: [{ title: "A" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Unexpected auth error");
    });

    it("doi または title がない場合は error に追加する", async () => {
        const req = makeRequest({ papers: [{}] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.errors).toHaveLength(1);
        expect(data.errors[0].message).toBe("doi または title が必要です");
    });

    it("取得時に例外が発生した場合は error に追加する", async () => {
        vi.mocked(bibtex.fetchBibtex).mockRejectedValueOnce(new Error("Network error"));

        const req = makeRequest({ papers: [{ title: "Error Paper" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.errors).toHaveLength(1);
        expect(data.errors[0].message).toBe("Network error");
    });

    it("取得時に Error インスタンス以外の例外が発生した場合は Unknown error になる", async () => {
        vi.mocked(bibtex.fetchBibtex).mockRejectedValueOnce("String error");

        const req = makeRequest({ papers: [{ title: "Error Paper" }] });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.errors).toHaveLength(1);
        expect(data.errors[0].message).toBe("Unknown error");
    });
});
