import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { getCitations, getReferences } = await import("../src/opencitations-client.js");

describe("OpenCitations Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("getCitations should parse citation response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                {
                    citing: "10.1234/citing1",
                    cited: "10.1234/target",
                    creation: "2024-01-15",
                },
                {
                    citing: "10.1234/citing2",
                    cited: "10.1234/target",
                    creation: "2023-06-20",
                },
            ],
        });

        const citations = await getCitations("10.1234/target");
        expect(citations).toHaveLength(2);
        expect(citations[0].citing).toBe("10.1234/citing1");
        expect(citations[0].cited).toBe("10.1234/target");
    });

    it("getCitations should return empty array on error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const citations = await getCitations("10.9999/nope");
        expect(citations).toHaveLength(0);
    });

    it("getReferences should parse reference response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                {
                    citing: "10.1234/source",
                    cited: "10.1234/ref1",
                    creation: "2022-03-10",
                },
            ],
        });

        const refs = await getReferences("10.1234/source");
        expect(refs).toHaveLength(1);
        expect(refs[0].cited).toBe("10.1234/ref1");
    });
});
