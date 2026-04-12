// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TagInput from "./TagInput";

describe("TagInput", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("300ms デバウンス後に候補APIを呼ぶ", async () => {
        const onChange = vi.fn();
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ suggestions: ["Machine Learning"] }),
        } as Response);

        render(<TagInput value={[]} onChange={onChange} />);
        fireEvent.change(screen.getByPlaceholderText("タグを入力（Enterで追加）"), {
            target: { value: "ma" },
        });

        expect(fetch).not.toHaveBeenCalled();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(299);
        });
        expect(fetch).not.toHaveBeenCalled();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            "/api/tags/suggest?q=ma&limit=10",
        );
    });

    it("Enterで自由入力タグを追加できる", () => {
        const onChange = vi.fn();
        render(<TagInput value={[]} onChange={onChange} />);
        const input = screen.getByPlaceholderText("タグを入力（Enterで追加）");
        fireEvent.change(input, { target: { value: "new-tag" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith(["new-tag"]);
    });

    it("同じプレフィックスなら再リクエストせずキャッシュ結果を使う", async () => {
        const onChange = vi.fn();
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ suggestions: ["Machine Learning", "Math"] }),
        } as Response);

        render(<TagInput value={[]} onChange={onChange} />);
        const input = screen.getByPlaceholderText("タグを入力（Enterで追加）");

        fireEvent.change(input, { target: { value: "ma" } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
            await Promise.resolve();
        });

        expect(fetch).toHaveBeenCalledTimes(1);

        fireEvent.change(input, { target: { value: "mac" } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
            await Promise.resolve();
        });

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("候補API失敗時にエラーメッセージを表示する", async () => {
        const onChange = vi.fn();
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "failed" }),
        } as Response);

        render(<TagInput value={[]} onChange={onChange} />);
        const input = screen.getByPlaceholderText("タグを入力（Enterで追加）");

        fireEvent.change(input, { target: { value: "ma" } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
            await Promise.resolve();
        });

        expect(screen.getByText("候補の取得に失敗しました")).toBeTruthy();
    });
});
