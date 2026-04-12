import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getNotionClient: vi.fn(),
}));

const auth = await import("@/lib/auth");
const { GET } = await import("./route");

function makeRequest() {
    return new NextRequest("http://localhost/api/databases", {
        headers: {
            cookie: "access_token=dummy_token",
        },
    });
}

describe("/api/databases GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Unauthorized 401 when access token is missing", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);

        const res = await GET(makeRequest());
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("Successfully fetches databases with various properties", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const mockSearch = vi.fn().mockResolvedValue({
            results: [
                {
                    id: "db1",
                    object: "data_source",
                    title: [{ plain_text: "DB One" }],
                    description: [{ plain_text: "Desc One" }],
                    icon: { type: "emoji", emoji: "🌟" }
                },
                {
                    id: "db2",
                    object: "data_source",
                    title: [{ plain_text: "DB Two" }],
                    description: [],
                    icon: { type: "external", external: { url: "https://example.com/icon.png" } }
                },
                {
                    id: "db3",
                    object: "data_source",
                    title: [],
                    description: [{ plain_text: "Desc Three" }],
                    icon: { type: "file", file: { url: "https://example.com/file.png" } }
                },
                {
                    id: "ignore1",
                    object: "page"
                }
            ],
            has_more: false,
        });

        vi.mocked(auth.getNotionClient).mockReturnValueOnce({ search: mockSearch } as any);

        const res = await GET(makeRequest());
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(mockSearch).toHaveBeenCalledWith({
            filter: { property: "object", value: "data_source" },
            page_size: 100,
            start_cursor: undefined,
        });

        expect(data.databases).toHaveLength(3);
        expect(data.databases[0]).toEqual({
            id: "db1",
            title: "DB One",
            description: "Desc One",
            icon: "🌟"
        });
        expect(data.databases[1]).toEqual({
            id: "db2",
            title: "DB Two",
            description: "",
            icon: "https://example.com/icon.png"
        });
        expect(data.databases[2]).toEqual({
            id: "db3",
            title: "(untitled database)",
            description: "Desc Three",
            icon: "https://example.com/file.png"
        });
    });

    it("Handles pagination properly", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const mockSearch = vi.fn()
            .mockResolvedValueOnce({
                results: [{ id: "db1", object: "data_source", title: [{ plain_text: "Page 1" }] }],
                has_more: true,
                next_cursor: "cursor_abc",
            })
            .mockResolvedValueOnce({
                results: [{ id: "db2", object: "data_source", title: [{ plain_text: "Page 2" }] }],
                has_more: false,
            });

        vi.mocked(auth.getNotionClient).mockReturnValueOnce({ search: mockSearch } as any);

        const res = await GET(makeRequest());
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(mockSearch).toHaveBeenCalledTimes(2);
        expect(mockSearch).toHaveBeenNthCalledWith(1, expect.objectContaining({ start_cursor: undefined }));
        expect(mockSearch).toHaveBeenNthCalledWith(2, expect.objectContaining({ start_cursor: "cursor_abc" }));

        expect(data.databases).toHaveLength(2);
        expect(data.databases[0].id).toBe("db1");
        expect(data.databases[1].id).toBe("db2");
    });

    it("Returns 500 when Notion API throws an error", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const mockSearch = vi.fn().mockRejectedValue(new Error("Notion API Error"));
        vi.mocked(auth.getNotionClient).mockReturnValueOnce({ search: mockSearch } as any);

        const res = await GET(makeRequest());
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Notion API Error");
    });
});
