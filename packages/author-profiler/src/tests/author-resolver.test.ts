import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAuthor, searchAuthors } from "@paper-tools/core";
import prompts from "prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	looksLikeAuthorId,
	resolveAuthorId,
} from "../services/author-resolver.js";

// Mock external dependencies
vi.mock("@paper-tools/core", () => ({
	getAuthor: vi.fn(),
	searchAuthors: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));

vi.mock("prompts", () => ({
	default: vi.fn(),
}));

const CACHE_DIR = join(homedir(), ".paper-tools", "author-profiler");
const CACHE_FILE = join(CACHE_DIR, "resolver-cache.json");

describe("author-resolver", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// By default, make readFile throw so readCache returns {}
		vi.mocked(readFile).mockRejectedValue(new Error("File not found"));
	});

	const mockSearchResponse = (data: unknown[]) => {
		vi.mocked(searchAuthors).mockResolvedValueOnce({
			data,
		} as unknown as import("@paper-tools/core").SearchResponse<
			import("@paper-tools/core").AuthorSearchResult
		>);
	};

	const mockGetAuthorResponse = (author: unknown) => {
		vi.mocked(getAuthor).mockResolvedValueOnce(
			author as unknown as import("@paper-tools/core").Author,
		);
	};

	const mockPromptsResponse = (authorId?: string) => {
		vi.mocked(prompts).mockResolvedValueOnce({
			authorId,
		} as unknown as prompts.Answers<string>);
	};

	describe("cache tests", () => {
		it("should continue with API lookup when reading the cache fails", async () => {
			mockSearchResponse([{ authorId: "id1", name: "Single Author" }]);
			const result = await resolveAuthorId("Single Author Query");
			expect(result).toEqual({ authorId: "id1", name: "Single Author" });
		});
	});

	describe("search response edge cases", () => {
		it("should handle response with null data correctly fallback to empty array", async () => {
			vi.mocked(searchAuthors).mockResolvedValueOnce(
				{} as unknown as import("@paper-tools/core").SearchResponse<
					import("@paper-tools/core").AuthorSearchResult
				>,
			);
			await expect(resolveAuthorId("Ghost Author")).rejects.toThrow(
				"著者が見つかりませんでした: Ghost Author",
			);
		});
	});

	describe("looksLikeAuthorId", () => {
		it("should return true for numeric strings", () => {
			expect(looksLikeAuthorId("123456")).toBe(true);
			expect(looksLikeAuthorId("  123  ")).toBe(true);
			expect(looksLikeAuthorId("0")).toBe(true);
		});

		it("should return false for non-numeric strings", () => {
			expect(looksLikeAuthorId("")).toBe(false);
			expect(looksLikeAuthorId("   ")).toBe(false);
			expect(looksLikeAuthorId("John Doe")).toBe(false);
			expect(looksLikeAuthorId("123a")).toBe(false);
			expect(looksLikeAuthorId("a123")).toBe(false);
			expect(looksLikeAuthorId("12.3")).toBe(false);
			expect(looksLikeAuthorId("-1")).toBe(false);
			expect(looksLikeAuthorId("+1")).toBe(false);
			expect(looksLikeAuthorId("1e3")).toBe(false);
		});
	});

	describe("resolveAuthorId - basic validation and cache", () => {
		it("should throw error if query is empty", async () => {
			await expect(resolveAuthorId("")).rejects.toThrow(
				"著者名またはAuthor IDを指定してください",
			);
			await expect(resolveAuthorId("   ")).rejects.toThrow(
				"著者名またはAuthor IDを指定してください",
			);
		});

		it("should return cached result if available", async () => {
			const cachedAuthor = { authorId: "123", name: "Cached Author" };
			vi.mocked(readFile).mockResolvedValueOnce(
				JSON.stringify({ "john doe": cachedAuthor }),
			);

			const result = await resolveAuthorId("John Doe");

			expect(result).toEqual(cachedAuthor);
			expect(readFile).toHaveBeenCalledWith(CACHE_FILE, "utf-8");
			expect(getAuthor).not.toHaveBeenCalled();
			expect(searchAuthors).not.toHaveBeenCalled();
		});
	});

	describe("resolveAuthorId - explicit ID resolution", () => {
		it("should call getAuthor if options.id is true", async () => {
			mockGetAuthorResponse({ authorId: "id123", name: "Resolved Author" });

			const result = await resolveAuthorId("id123", { id: true });

			expect(result).toEqual({ authorId: "id123", name: "Resolved Author" });
			expect(getAuthor).toHaveBeenCalledWith("id123", ["authorId", "name"]);
			expect(writeFile).toHaveBeenCalled();
		});

		it("should call getAuthor if input looks like author ID", async () => {
			mockGetAuthorResponse({ authorId: "12345", name: "Numeric Author" });

			const result = await resolveAuthorId("12345");

			expect(result).toEqual({ authorId: "12345", name: "Numeric Author" });
			expect(getAuthor).toHaveBeenCalledWith("12345", ["authorId", "name"]);
		});

		it("should throw if getAuthor does not return authorId", async () => {
			mockGetAuthorResponse({});

			await expect(resolveAuthorId("12345")).rejects.toThrow(
				"Author not found: 12345",
			);
		});

		it("should propagate getAuthor failures", async () => {
			vi.mocked(getAuthor).mockRejectedValueOnce(new Error("API Failure"));

			await expect(resolveAuthorId("12345")).rejects.toThrow("API Failure");
		});
	});

	describe("resolveAuthorId - single candidate search", () => {
		it("should resolve single candidate automatically and skip prompt", async () => {
			mockSearchResponse([{ authorId: "id1", name: "Single Author" }]);

			const result = await resolveAuthorId("Single Author Query");

			expect(result).toEqual({ authorId: "id1", name: "Single Author" });
			expect(searchAuthors).toHaveBeenCalledWith("Single Author Query", {
				limit: 10,
			});
			expect(prompts).not.toHaveBeenCalled();
		});

		it("should throw error if single candidate lacks authorId", async () => {
			mockSearchResponse([{ name: "Single Author No ID" }]);

			await expect(resolveAuthorId("Single Author Query")).rejects.toThrow(
				"著者IDが取得できませんでした",
			);
		});

		it("should propagate searchAuthors failures", async () => {
			vi.mocked(searchAuthors).mockRejectedValueOnce(
				new Error("Search API Failure"),
			);

			await expect(resolveAuthorId("John Doe")).rejects.toThrow(
				"Search API Failure",
			);
		});
	});

	describe("resolveAuthorId - multiple candidates search", () => {
		const mockCandidates = [
			{
				authorId: "id1",
				name: "John Doe 1",
				hIndex: 10,
				paperCount: 50,
				affiliations: ["Univ A"],
			},
			{
				authorId: "id2",
				name: "John Doe 2",
				hIndex: 5,
				paperCount: 20,
				affiliations: ["Univ B"],
			},
		];

		it("should throw error if search returns no candidates", async () => {
			mockSearchResponse([]);

			await expect(resolveAuthorId("Ghost Author")).rejects.toThrow(
				"著者が見つかりませんでした: Ghost Author",
			);
		});

		it("should return the first candidate if interactive is false", async () => {
			mockSearchResponse(mockCandidates);

			const result = await resolveAuthorId("John Doe", { interactive: false });

			expect(result).toEqual({ authorId: "id1", name: "John Doe 1" });
			expect(prompts).not.toHaveBeenCalled();
		});

		it("should prompt user and return selected candidate if interactive is true", async () => {
			mockSearchResponse(mockCandidates);
			mockPromptsResponse("id2");

			const result = await resolveAuthorId("John Doe", { interactive: true });

			expect(result).toEqual({ authorId: "id2", name: "John Doe 2" });
			expect(prompts).toHaveBeenCalled();
		});

		it("should throw error if user cancels the prompt", async () => {
			mockSearchResponse(mockCandidates);
			mockPromptsResponse(undefined);

			await expect(resolveAuthorId("John Doe")).rejects.toThrow(
				"著者選択がキャンセルされました",
			);
		});

		it("should throw error if selected candidate lacks authorId", async () => {
			mockSearchResponse([{ name: "Bad 1" }, { name: "Bad 2" }]);
			mockPromptsResponse("some_id");

			await expect(resolveAuthorId("John Doe")).rejects.toThrow(
				"著者IDが取得できませんでした",
			);
		});
	});
});
