// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CoauthorNetworkGraph from "./CoauthorNetworkGraph";

const mockCytoscape = vi.fn(() => ({
    destroy: vi.fn(),
}));

vi.mock("cytoscape", () => {
    return {
        default: mockCytoscape
    };
});

describe("CoauthorNetworkGraph", () => {
    beforeEach(() => {
        mockCytoscape.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders empty state when no coauthors are provided", () => {
        render(
            <CoauthorNetworkGraph
                authorId="1"
                authorName="John Doe"
                coauthors={[]}
            />
        );
        expect(screen.getByText("共著ネットワークのデータがありません。")).toBeTruthy();
    });

    it("renders the graph container when coauthors are provided", async () => {
        const { container, unmount } = render(
            <CoauthorNetworkGraph
                authorId="1"
                authorName="John Doe"
                coauthors={[
                    { authorId: "2", name: "Jane Smith", paperCount: 5 }
                ]}
            />
        );

        expect(container.querySelector('.h-\\[360px\\]')).toBeTruthy();

        await waitFor(() => {
            expect(mockCytoscape).toHaveBeenCalled();
        });

        // Test unmounting to cover the destroy path
        unmount();
    });
});
