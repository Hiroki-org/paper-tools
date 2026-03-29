import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@paper-tools/core", () => ({
    normalizeDoi: (d: string) => d,
}));

vi.mock("@paper-tools/bibtex/lib", () => ({
    fetchBibtex: vi.fn(),
    formatBibtex: vi.fn(),
    deriveBibtexKey: vi.fn(),
}));

const bibtex = await import("@paper-tools/bibtex/lib");
const { GET } = await import("./route");

describe("/api/bibtex GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("doi で BibTeX を取得して返す", async () => {
        vi.mocked(bibtex.fetchBibtex).mockResolvedValueOnce({
            bibtex: "@article{tmp,title={A}}",
            source: "crossref",
        } as any);
        vi.mocked(bibtex.deriveBibtexKey).mockReturnValueOnce("mukai2026a");
        vi.mocked(bibtex.formatBibtex).mockReturnValueOnce({
            formatted: "@article{mukai2026a,title={A}}",
            warnings: [],
        } as any);

        const req = new NextRequest("http://localhost/api/bibtex?doi=10.1000/xyz");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(bibtex.fetchBibtex).toHaveBeenCalledWith({ doi: "10.1000/xyz", title: undefined });
        expect(data.source).toBe("crossref");
        expect(data.bibtex).toContain("mukai2026a");
    });

    it("doi/title が空なら 400", async () => {
        const req = new NextRequest("http://localhost/api/bibtex");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("doi または title");
    });

    it("取得失敗時は 404", async () => {
        vi.mocked(bibtex.fetchBibtex).mockResolvedValueOnce(null as any);

        const req = new NextRequest("http://localhost/api/bibtex?title=Sample");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.error).toContain("取得");
    });
});
