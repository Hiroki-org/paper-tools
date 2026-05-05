// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchForm from "./SearchForm";

describe("SearchForm", () => {
    it("renders correctly with default props", () => {
        render(<SearchForm onSearch={vi.fn()} />);

        screen.getByLabelText("Keyword");
        screen.getByLabelText("Max Results");
        screen.getByRole("button", { name: "Search" });
    });

    it("calls onSearch with trimmed query and maxResults on submit", async () => {
        const onSearchMock = vi.fn();
        render(<SearchForm onSearch={onSearchMock} />);
        const user = userEvent.setup();

        const keywordInput = screen.getByLabelText("Keyword");
        await user.type(keywordInput, "  test query  ");

        const maxResultsInput = screen.getByLabelText("Max Results");
        await user.clear(maxResultsInput);
        await user.type(maxResultsInput, "50");

        const submitButton = screen.getByRole("button", { name: "Search" });
        await user.click(submitButton);

        expect(onSearchMock).toHaveBeenCalledTimes(1);
        expect(onSearchMock).toHaveBeenCalledWith("test query", 50);
    });

    it("does not call onSearch if query is empty or whitespace", () => {
        const onSearchMock = vi.fn();
        render(<SearchForm onSearch={onSearchMock} />);

        const keywordInput = screen.getByLabelText("Keyword");
        const formElement = keywordInput.closest("form");
        if (!formElement) {
            throw new Error("Form element not found");
        }

        fireEvent.submit(formElement);
        expect(onSearchMock).not.toHaveBeenCalled();

        fireEvent.change(keywordInput, { target: { value: "   " } });
        fireEvent.submit(formElement);
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

    it("button is disabled when query is empty", async () => {
        const user = userEvent.setup();
        render(<SearchForm onSearch={vi.fn()} />);

        const submitButton = screen.getByRole("button", { name: "Search" }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);

        const keywordInput = screen.getByLabelText("Keyword");
        await user.type(keywordInput, "a");

        expect(submitButton.disabled).toBe(false);
    });
});
