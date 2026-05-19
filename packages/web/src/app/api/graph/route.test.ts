import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@paper-tools/visualizer", () => ({
    buildCitationGraph: vi.fn(),
}));

const visualizer = await import("@paper-tools/visualizer");
const { GET } = await import("./route");

// @vitest-environment jsdom

describe("/api/graph GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("doi が指定された場合、デフォルトの depth と direction でグラフを返す", async () => {
        vi.mocked(visualizer.buildCitationGraph).mockResolvedValueOnce({
            nodes: [{ id: "10.1000/xyz", label: "Paper" }],
            edges: [],
        } as any);

        const req = new NextRequest("http://localhost/api/graph?doi=10.1000/xyz");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(visualizer.buildCitationGraph).toHaveBeenCalledWith("10.1000/xyz", 1, "both");
        expect(data.graph).toBeDefined();
        expect(data.graph.nodes[0].id).toBe("10.1000/xyz");
    });

    it("doi とともに depth と direction が指定された場合、それらの値でグラフを返す", async () => {
        vi.mocked(visualizer.buildCitationGraph).mockResolvedValueOnce({
            nodes: [],
            edges: [],
        } as any);

        const req = new NextRequest("http://localhost/api/graph?doi=10.1000/xyz&depth=2&direction=forward");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(visualizer.buildCitationGraph).toHaveBeenCalledWith("10.1000/xyz", 2, "forward");
        expect(data.graph).toBeDefined();
    });

    it("doi が空の場合は 400 を返す", async () => {
        const req = new NextRequest("http://localhost/api/graph");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("doi parameter is required");
    });

    it("buildCitationGraph でエラーが発生した場合は 500 を返す", async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(visualizer.buildCitationGraph).mockRejectedValueOnce(new Error("Graph build error"));

        const req = new NextRequest("http://localhost/api/graph?doi=10.1000/xyz");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Graph build error");
    });
});
