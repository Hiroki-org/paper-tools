import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/recommender", () => ({
	recommendFromMultiple: vi.fn(),
	recommendFromSingle: vi.fn(),
	resolveToS2Id: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	isAuthenticated: vi.fn(),
}));

const recommender = await import("@paper-tools/recommender");
const auth = await import("@/lib/auth");
const { POST } = await import("./route");

function makeRequest(body: unknown) {
	return new NextRequest("http://localhost/api/recommend", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});
}

describe("/api/recommend POST", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(auth.isAuthenticated).mockReturnValue(true);
	});

	it("認証されていない場合は401を返す", async () => {
		vi.mocked(auth.isAuthenticated).mockReturnValueOnce(false);
		const res = await POST(makeRequest({ paperId: "p1" }));
		const data = await res.json();

		expect(res.status).toBe(401);
		expect(data.error).toBe("Unauthorized");
		expect(recommender.resolveToS2Id).not.toHaveBeenCalled();
	});

	it("単一論文の推薦結果を返す", async () => {
		vi.mocked(recommender.resolveToS2Id).mockResolvedValueOnce("s2-1");
		vi.mocked(recommender.recommendFromSingle).mockResolvedValueOnce([
			{ paperId: "rec-1", title: "Recommended Paper" },
		] as Awaited<ReturnType<typeof recommender.recommendFromSingle>>);

		const res = await POST(makeRequest({ paperId: "doi:10.1000/xyz", limit: 5 }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(recommender.resolveToS2Id).toHaveBeenCalledWith("doi:10.1000/xyz");
		expect(recommender.recommendFromSingle).toHaveBeenCalledWith("s2-1", {
			limit: 5,
			from: undefined,
		});
		expect(data.total).toBe(1);
		expect(data.papers[0].paperId).toBe("rec-1");
	});
});
