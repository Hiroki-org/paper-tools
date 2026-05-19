import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/core", () => ({
	getPaper: vi.fn(),
	searchPapers: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	isAuthenticated: vi.fn(),
}));

const core = await import("@paper-tools/core");
const auth = await import("@/lib/auth");
const { POST } = await import("./route");

function makeRequest(body: unknown) {
	return new NextRequest("http://localhost/api/resolve", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});
}

describe("/api/resolve POST", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(auth.isAuthenticated).mockReturnValue(true);
	});

	it("認証されていない場合は401を返す", async () => {
		vi.mocked(auth.isAuthenticated).mockReturnValueOnce(false);
		const res = await POST(makeRequest({ doi: "10.1000/xyz" }));
		const data = await res.json();

		expect(res.status).toBe(401);
		expect(data.error).toBe("認証が必要です");
	});

	it("doi から論文を解決する", async () => {
		vi.mocked(core.getPaper).mockResolvedValueOnce({
			paperId: "s2-1",
			title: "Paper",
			externalIds: { DOI: "10.1000/xyz" },
		} as unknown as import("@paper-tools/core").S2Paper);

		const res = await POST(makeRequest({ doi: "10.1000/xyz" }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(core.getPaper).toHaveBeenCalledWith("DOI:10.1000/xyz");
		expect(data.paper.paperId).toBe("s2-1");
	});

	it("title から最初の検索結果を返す", async () => {
		vi.mocked(core.searchPapers).mockResolvedValueOnce({
			total: 1,
			offset: 0,
			data: [{ paperId: "s2-title", title: "A Title" }],
		} as unknown as import("@paper-tools/core").SearchResponse);

		const res = await POST(makeRequest({ title: "A Title" }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(core.searchPapers).toHaveBeenCalledWith("A Title");
		expect(data.paper.paperId).toBe("s2-title");
	});

	it("s2Id から論文を解決する", async () => {
		vi.mocked(core.getPaper).mockResolvedValueOnce({
			paperId: "abc123",
			title: "By ID",
		} as unknown as import("@paper-tools/core").S2Paper);

		const res = await POST(makeRequest({ s2Id: "abc123" }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(core.getPaper).toHaveBeenCalledWith("abc123");
		expect(data.paper.paperId).toBe("abc123");
	});

	it("入力不足は400", async () => {
		const res = await POST(makeRequest({}));
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toContain("いずれか1つが必要");
	});

	it("タイトル検索で結果がない場合は404", async () => {
		vi.mocked(core.searchPapers).mockResolvedValueOnce({
			total: 0,
			offset: 0,
			data: [],
		} as unknown as import("@paper-tools/core").SearchResponse);

		const res = await POST(makeRequest({ title: "Not Found" }));
		const data = await res.json();

		expect(res.status).toBe(404);
		expect(data.error).toContain("解決できませんでした");
	});
});
