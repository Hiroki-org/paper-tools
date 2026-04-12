// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@paper-tools/visualizer", () => ({
  formatGraph: vi.fn(),
  SUPPORTED_FORMATS: ["json", "dot", "mermaid"],
}));

const visualizer = await import("@paper-tools/visualizer");
const { POST } = await import("./route");

describe("/api/graph/export POST", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockGraph = {
    nodes: [{ id: "1", title: "Paper 1" }],
    edges: [],
  };

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost/api/graph/export", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("graphとformatが必須であることをチェックする", async () => {
    // Both missing
    let req = createRequest({});
    let res = await POST(req);
    let data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("graph and format are required");

    // Only format present
    req = createRequest({ format: "json" });
    res = await POST(req);
    expect(res.status).toBe(400);

    // Only graph present
    req = createRequest({ graph: mockGraph });
    res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("サポートされていないformatで400を返す", async () => {
    const req = createRequest({ graph: mockGraph, format: "xml" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Unsupported format");
  });

  it("formatがjsonのとき、toJsonの結果を返す", async () => {
    const mockOutput = '{"mocked": "json"}';
    vi.mocked(visualizer.formatGraph).mockReturnValueOnce(mockOutput);

    const req = createRequest({ graph: mockGraph, format: "json" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.output).toBe(mockOutput);
    expect(data.format).toBe("json");
    expect(visualizer.formatGraph).toHaveBeenCalledWith(mockGraph, "json");
  });

  it("formatがdotのとき、toDotの結果を返す", async () => {
    const mockOutput = "digraph { mock }";
    vi.mocked(visualizer.formatGraph).mockReturnValueOnce(mockOutput);

    const req = createRequest({ graph: mockGraph, format: "dot" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.output).toBe(mockOutput);
    expect(data.format).toBe("dot");
    expect(visualizer.formatGraph).toHaveBeenCalledWith(mockGraph, "dot");
  });

  it("formatがmermaidのとき、toMermaidの結果を返す", async () => {
    const mockOutput = "graph TD; mock;";
    vi.mocked(visualizer.formatGraph).mockReturnValueOnce(mockOutput);

    const req = createRequest({ graph: mockGraph, format: "mermaid" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.output).toBe(mockOutput);
    expect(data.format).toBe("mermaid");
    expect(visualizer.formatGraph).toHaveBeenCalledWith(mockGraph, "mermaid");
  });

  it("予期せぬエラー発生時に500を返す", async () => {
    // 異常なJSONを渡してエラーを誘発する
    const req = new NextRequest("http://localhost/api/graph/export", {
      method: "POST",
      body: "invalid json",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
