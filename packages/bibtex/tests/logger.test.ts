import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultLogger } from "../src/logger.js";

describe("defaultLogger", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should call console.info", () => {
		const spy = vi.spyOn(console, "info").mockImplementation(() => {});
		defaultLogger.info("test", 123);
		expect(spy).toHaveBeenCalledWith("test", 123);
	});

	it("should call console.warn", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		defaultLogger.warn("test warning");
		expect(spy).toHaveBeenCalledWith("test warning");
	});

	it("should call console.error", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		defaultLogger.error("test error");
		expect(spy).toHaveBeenCalledWith("test error");
	});
});
