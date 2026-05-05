// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CoauthorNetworkGraph from "./CoauthorNetworkGraph";

const createCytoscapeMockInstance = () => ({
    destroy: vi.fn(),
});

const mockCytoscape = vi.fn(createCytoscapeMockInstance);

vi.mock("cytoscape", () => ({
    default: mockCytoscape,
}));

describe("CoauthorNetworkGraph", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockCytoscape.mockImplementation(createCytoscapeMockInstance);
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

        const instance = mockCytoscape.mock.results[0]?.value;
        unmount();
        expect(instance?.destroy).toHaveBeenCalledTimes(1);
    });
});
