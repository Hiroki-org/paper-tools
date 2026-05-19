import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/drilldown", () => ({
	searchByKeyword: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	isAuthenticated: vi.fn(),
}));

const drilldown = await import("@paper-tools/drilldown");
const auth = await import("@/lib/auth");
const { GET } = await import("./route");

describe("/api/search GET", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(auth.isAuthenticated).mockReturnValue(true);
	});

	it("認証されていない場合は401を返す", async () => {
		vi.mocked(auth.isAuthenticated).mockReturnValueOnce(false);
		const req = new NextRequest("http://localhost/api/search?q=graph");
		const res = await GET(req);
		const data = await res.json();

		expect(res.status).toBe(401);
		expect(data.error).toBe("Unauthorized");
		expect(drilldown.searchByKeyword).not.toHaveBeenCalled();
	});

	it("認証済みの場合は検索結果を返す", async () => {
		vi.mocked(drilldown.searchByKeyword).mockResolvedValueOnce([
			{ paperId: "p1", title: "Graph Paper" },
		] as Awaited<ReturnType<typeof drilldown.searchByKeyword>>);

		const req = new NextRequest(
			"http://localhost/api/search?q=graph&maxResults=250",
		);
		const res = await GET(req);
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(drilldown.searchByKeyword).toHaveBeenCalledWith("graph", 100);
		expect(data.total).toBe(1);
		expect(data.papers[0].paperId).toBe("p1");
	});
});
