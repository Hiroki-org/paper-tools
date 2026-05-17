export interface Logger {
	info(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

export const defaultLogger: Logger = {
	info: (...args: unknown[]) => console.log(...args),
	error: (...args: unknown[]) => console.error(...args),
};

let currentLogger: Logger = defaultLogger;

export function setLogger(logger: Logger) {
	currentLogger = logger;
}

export const logger: Logger = {
	info: (...args: unknown[]) => currentLogger.info(...args),
	error: (...args: unknown[]) => currentLogger.error(...args),
};
