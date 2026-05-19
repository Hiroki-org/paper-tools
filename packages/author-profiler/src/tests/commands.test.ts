import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCoauthorsCommand } from "../commands/coauthors.js";
import { runPapersCommand } from "../commands/papers.js";
import { runProfileCommand } from "../commands/profile.js";
import { runSaveCommand } from "../commands/save.js";
import type { Logger } from "../logger.js";
import { saveAuthorProfileToNotion } from "../notion/author-client.js";
import { resolveAuthorId } from "../services/author-resolver.js";
import { buildCoauthorNetwork } from "../services/coauthor-network.js";
import { buildAuthorProfile } from "../services/profile-builder.js";

vi.mock("../services/profile-builder.js", () => ({
	buildAuthorProfile: vi.fn(),
}));

vi.mock("../services/author-resolver.js", () => ({
	resolveAuthorId: vi.fn(),
}));

vi.mock("../services/coauthor-network.js", () => ({
	buildCoauthorNetwork: vi.fn(),
}));

vi.mock("../notion/author-client.js", () => ({
	saveAuthorProfileToNotion: vi.fn(),
}));

describe("author-profiler command handlers", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = {
			log: vi.fn(),
			table: vi.fn(),
			error: vi.fn(),
		};
		vi.mocked(resolveAuthorId).mockResolvedValue({
			authorId: "123",
			name: "Alice",
		});
	});

	it("runProfileCommand prints JSON when --json is true", async () => {
		vi.mocked(buildAuthorProfile).mockResolvedValue({
			id: "123",
			name: "Alice",
			aliases: [],
			affiliations: [{ name: "Example U" }],
			homepage: "https://example.com",
			hIndex: 10,
			citationCount: 100,
			paperCount: 5,
			influentialCitationCount: 4,
			topPapers: [],
			coauthors: [],
			topicTimeline: [],
		});

		await runProfileCommand("Alice", { json: true }, mockLogger);

		expect(resolveAuthorId).toHaveBeenCalledWith("Alice", { id: undefined });
		expect(buildAuthorProfile).toHaveBeenCalledWith("123");
		expect(mockLogger.log).toHaveBeenCalledTimes(1);
		expect(mockLogger.table).not.toHaveBeenCalled();
	});

	it("runProfileCommand prints table when --json is false", async () => {
		vi.mocked(buildAuthorProfile).mockResolvedValue({
			id: "123",
			name: "Alice",
			aliases: [],
			affiliations: [{ name: "Example U" }],
			homepage: undefined,
			hIndex: 10,
			citationCount: 100,
			paperCount: 5,
			influentialCitationCount: 4,
			topPapers: [],
			coauthors: [],
			topicTimeline: [],
		});

		await runProfileCommand("Alice", {}, mockLogger);

		expect(mockLogger.log).toHaveBeenCalled();
		expect(mockLogger.table).toHaveBeenCalledTimes(1);
	});

	it("runPapersCommand validates --top and throws for invalid values", async () => {
		await expect(
			runPapersCommand("Alice", { top: "0" }, mockLogger),
		).rejects.toThrow("--top には正の整数を指定してください: 0");
	});

	it("runPapersCommand renders top papers table", async () => {
		vi.mocked(buildAuthorProfile).mockResolvedValue({
			id: "123",
			name: "Alice",
			aliases: [],
			affiliations: [],
			homepage: undefined,
			hIndex: 10,
			citationCount: 100,
			paperCount: 5,
			influentialCitationCount: 4,
			topPapers: [
				{
					title: "Paper A",
					authors: [{ name: "Alice" }],
					year: 2024,
					venue: "ICSE",
					citationCount: 10,
				},
				{
					title: "Paper B",
					authors: [{ name: "Alice" }],
					year: 2023,
					venue: "ASE",
					citationCount: 8,
				},
			],
			coauthors: [],
			topicTimeline: [],
		});

		await runPapersCommand("Alice", { top: "2" }, mockLogger);

		expect(buildAuthorProfile).toHaveBeenCalledWith("123", { topPapers: 2 });
		expect(mockLogger.table).toHaveBeenCalledTimes(1);
	});

	it("runCoauthorsCommand validates depth and throws when depth is not 1", async () => {
		await expect(
			runCoauthorsCommand("Alice", { depth: "2" }, mockLogger),
		).rejects.toThrow("現在 --depth は 1 のみ対応しています");
	});

	it("runCoauthorsCommand renders coauthor network table", async () => {
		vi.mocked(buildCoauthorNetwork).mockResolvedValue([
			{ authorId: "a1", name: "Bob", paperCount: 3 },
			{ authorId: "a2", name: "Carol", paperCount: 2 },
		]);

		await runCoauthorsCommand("Alice", { depth: "1" }, mockLogger);

		expect(buildCoauthorNetwork).toHaveBeenCalledWith("123", {
			limit: 200,
			sort: "citationCount:desc",
		});
		expect(mockLogger.table).toHaveBeenCalledTimes(1);
	});

	it("runSaveCommand prints dry-run payload for dry-run action", async () => {
		vi.mocked(buildAuthorProfile).mockResolvedValue({
			id: "123",
			name: "Alice",
			aliases: [],
			affiliations: [],
			homepage: undefined,
			hIndex: 10,
			citationCount: 100,
			paperCount: 5,
			influentialCitationCount: 4,
			topPapers: [],
			coauthors: [],
			topicTimeline: [],
		});
		vi.mocked(saveAuthorProfileToNotion).mockResolvedValue({
			action: "dry-run",
		});

		await runSaveCommand("Alice", { dryRun: true }, mockLogger);

		expect(saveAuthorProfileToNotion).toHaveBeenCalledWith(expect.any(Object), {
			dryRun: true,
		});
		expect(mockLogger.log).toHaveBeenCalledTimes(1);
	});

	it("runSaveCommand prints persisted result for created/updated action", async () => {
		vi.mocked(buildAuthorProfile).mockResolvedValue({
			id: "123",
			name: "Alice",
			aliases: [],
			affiliations: [],
			homepage: undefined,
			hIndex: 10,
			citationCount: 100,
			paperCount: 5,
			influentialCitationCount: 4,
			topPapers: [],
			coauthors: [],
			topicTimeline: [],
		});
		vi.mocked(saveAuthorProfileToNotion).mockResolvedValue({
			action: "created",
			pageId: "page-1",
		});

		await runSaveCommand("Alice", {}, mockLogger);

		expect(mockLogger.log).toHaveBeenCalledTimes(1);
	});
});
