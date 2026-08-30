import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the imported module BEFORE importing the file under test
vi.mock("@paper-tools/core", () => ({
	searchVenuePublications: vi.fn(),
}));

const { searchConferencePapers } = await import("../src/dblp-integration.js");
const { searchVenuePublications } = await import("@paper-tools/core");

describe("searchConferencePapers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should call searchVenuePublications with correct arguments and return its result", async () => {
		const mockPapers = [{ title: "Test Paper", authors: [] }];
		vi.mocked(searchVenuePublications).mockResolvedValueOnce(
			mockPapers as unknown as ReturnType<typeof searchVenuePublications>,
		);

		const result = await searchConferencePapers("ICSE", 2026, 50);

		expect(searchVenuePublications).toHaveBeenCalledWith("ICSE", 2026, 50);
		expect(searchVenuePublications).toHaveBeenCalledTimes(1);
		expect(result).toEqual(mockPapers);
	});

	it("should use default maxResults of 100 if not provided", async () => {
		vi.mocked(searchVenuePublications).mockResolvedValueOnce([]);

		await searchConferencePapers("ICSE", 2026);

		expect(searchVenuePublications).toHaveBeenCalledWith("ICSE", 2026, 100);
	});

	it("should handle undefined year", async () => {
		vi.mocked(searchVenuePublications).mockResolvedValueOnce([]);

		await searchConferencePapers("ICSE");

		expect(searchVenuePublications).toHaveBeenCalledWith(
			"ICSE",
			undefined,
			100,
		);
	});
});
