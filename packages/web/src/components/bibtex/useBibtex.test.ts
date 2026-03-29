import { describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/core", () => ({
    normalizeDoi: (value?: string | null) => {
        if (!value) return undefined;
        const normalized = value.trim().replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
        return normalized === "" ? undefined : normalized;
    },
}));

describe("useBibtex module", () => {
    it("can be imported and exposes useBibtex hook", async () => {
        const mod = await import("./useBibtex");
        expect(typeof mod.useBibtex).toBe("function");
    });
});
