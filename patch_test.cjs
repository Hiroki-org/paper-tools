const fs = require('fs');
let code = fs.readFileSync('packages/recommender/tests/notion-client.test.ts', 'utf8');

const newTests = `
    it("getDatabaseInfo should return database info correctly", async () => {
        const { getDatabaseInfo } = await import("../src/notion-client.js");
        mockClient.databases.retrieve.mockResolvedValueOnce({
            title: [{ plain_text: "Test" }, {}, null, { plain_text: " DB" }],
        });
        const clientWithUsers = {
            ...mockClient,
            users: {
                me: vi.fn().mockResolvedValueOnce({ name: "Test User" }),
            }
        };

        const info = await getDatabaseInfo("db-1", clientWithUsers as any);

        expect(info.databaseName).toBe("Test DB");
        expect(info.workspaceName).toBe("Test User");
    });

    it("readTitle and readRichText should handle NotionRichTextItem mapping", async () => {
        const { queryPapers } = await import("../src/notion-client.js");
        mockClient.databases.query.mockResolvedValueOnce({
            results: [
                {
                    id: "page-1",
                    properties: {
                        "タイトル": { type: "title", title: [{ plain_text: "Mapped" }, {}, null, { plain_text: " Title" }] },
                        "DOI": { type: "rich_text", rich_text: [null, {}, { plain_text: "10.1000/mapped" }] },
                        "Semantic Scholar ID": { type: "rich_text", rich_text: [] },
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });

        const papers = await queryPapers("db-1", mockClient as any);

        expect(papers[0].title).toBe("Mapped Title");
        expect(papers[0].doi).toBe("10.1000/mapped");
    });

    it("readTitle and readRichText should handle null or invalid properties gracefully", async () => {
        const { queryPapers } = await import("../src/notion-client.js");
        mockClient.databases.query.mockResolvedValueOnce({
            results: [
                {
                    id: "page-1",
                    properties: {
                        "タイトル": { type: "title", title: null },
                        "DOI": { type: "rich_text", rich_text: null },
                        "Semantic Scholar ID": { type: "invalid_type", rich_text: [] },
                    },
                },
                {
                    id: "page-2",
                    properties: {},
                }
            ],
            has_more: false,
            next_cursor: null,
        });

        const papers = await queryPapers("db-1", mockClient as any);

        expect(papers[0].title).toBe("");
        expect(papers[0].doi).toBe(undefined);
        expect(papers[1].title).toBe("");
        expect(papers[1].doi).toBe(undefined);
    });
`;

code = code.replace(/}\);\n$/, newTests + "\n});\n");
fs.writeFileSync('packages/recommender/tests/notion-client.test.ts', code);
