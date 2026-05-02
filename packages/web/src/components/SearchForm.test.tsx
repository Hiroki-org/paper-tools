// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchForm from "./SearchForm";

describe("SearchForm", () => {
    it("renders correctly with default props", () => {
        render(<SearchForm onSearch={vi.fn()} />);

        expect(screen.getByLabelText("Keyword")).toBeTruthy();
        expect(screen.getByLabelText("Max Results")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
    });

    it("calls onSearch with correct query and maxResults on submit", () => {
        const onSearchMock = vi.fn();
        render(<SearchForm onSearch={onSearchMock} />);

        const keywordInput = screen.getByLabelText("Keyword");
        fireEvent.change(keywordInput, { target: { value: "test query" } });

        const maxResultsInput = screen.getByLabelText("Max Results");
        fireEvent.change(maxResultsInput, { target: { value: "50" } });

        const submitButton = screen.getByRole("button", { name: "Search" });
        fireEvent.click(submitButton);

        expect(onSearchMock).toHaveBeenCalledTimes(1);
        expect(onSearchMock).toHaveBeenCalledWith("test query", 50);
    });

    it("does not call onSearch if query is empty or whitespace", () => {
        const onSearchMock = vi.fn();
        render(<SearchForm onSearch={onSearchMock} />);

        const submitButton = screen.getByRole("button", { name: "Search" });

        // Empty query (initial state)
        fireEvent.click(submitButton);
        expect(onSearchMock).not.toHaveBeenCalled();

        // Whitespace query
        const keywordInput = screen.getByLabelText("Keyword");
        fireEvent.change(keywordInput, { target: { value: "   " } });
        fireEvent.click(submitButton);
        expect(onSearchMock).not.toHaveBeenCalled();
    });

    it("disables inputs and button when loading is true", () => {
        render(<SearchForm onSearch={vi.fn()} loading={true} />);

        const keywordInput = screen.getByLabelText("Keyword") as HTMLInputElement;
        const maxResultsInput = screen.getByLabelText("Max Results") as HTMLInputElement;
        const submitButton = screen.getByRole("button", { name: "Searching…" }) as HTMLButtonElement;

        expect(keywordInput.disabled).toBe(true);
        expect(maxResultsInput.disabled).toBe(true);
        expect(submitButton.disabled).toBe(true);
    });

    it("button is disabled when query is empty", () => {
        render(<SearchForm onSearch={vi.fn()} />);

        const submitButton = screen.getByRole("button", { name: "Search" }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);

        const keywordInput = screen.getByLabelText("Keyword");
        fireEvent.change(keywordInput, { target: { value: "a" } });

        expect(submitButton.disabled).toBe(false);
    });
});
