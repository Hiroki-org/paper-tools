import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	defaultLogger,
	type Logger,
	logger,
	setLogger,
} from "../src/logger.js";

describe("Logger", () => {
	beforeEach(() => {
		// Reset to default logger before each test
		setLogger(defaultLogger);
	});

	it("uses default console.log for info", () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		logger.info("Test message", 123);

		expect(logSpy).toHaveBeenCalledWith("Test message", 123);
		logSpy.mockRestore();
	});

	it("uses default console.error for error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		logger.error("Test error", 456);

		expect(errorSpy).toHaveBeenCalledWith("Test error", 456);
		errorSpy.mockRestore();
	});

	it("allows injecting a custom logger", () => {
		const customInfo = vi.fn();
		const customError = vi.fn();

		const customLogger: Logger = {
			info: customInfo,
			error: customError,
		};

		setLogger(customLogger);

		logger.info("Custom info message");
		expect(customInfo).toHaveBeenCalledWith("Custom info message");

		logger.error("Custom error message");
		expect(customError).toHaveBeenCalledWith("Custom error message");
	});
});
