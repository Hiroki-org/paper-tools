import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	defaultLogger,
	type Logger,
	logger,
	setLogger,
} from "../src/logger.js";

describe("logger", () => {
	beforeEach(() => {
		setLogger(defaultLogger);
	});

	it("defaultLogger should map info to console.log", () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		defaultLogger.info("test message");
		expect(logSpy).toHaveBeenCalledWith("test message");
		logSpy.mockRestore();
	});

	it("defaultLogger should map warn to console.error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		defaultLogger.warn("test warning");
		expect(errorSpy).toHaveBeenCalledWith("test warning");
		errorSpy.mockRestore();
	});

	it("defaultLogger should map error to console.error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		defaultLogger.error("test error");
		expect(errorSpy).toHaveBeenCalledWith("test error");
		errorSpy.mockRestore();
	});

	it("should route messages to the currently set logger", () => {
		const mockLogger: Logger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		setLogger(mockLogger);

		logger.info("info msg", 1, 2);
		logger.warn("warn msg", { a: 1 });
		logger.error(new Error("error msg"));

		expect(mockLogger.info).toHaveBeenCalledWith("info msg", 1, 2);
		expect(mockLogger.warn).toHaveBeenCalledWith("warn msg", { a: 1 });
		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
	});
});
