export interface Logger {
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	info(message: string, ...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	warn(message: string, ...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	error(message: string | Error, ...args: any[]): void;
}

export const defaultLogger: Logger = {
	info: (message, ...args) => console.log(message, ...args),
	warn: (message, ...args) => console.error(message, ...args),
	error: (message, ...args) => console.error(message, ...args),
};

let currentLogger: Logger = defaultLogger;

export function setLogger(logger: Logger) {
	currentLogger = logger;
}

export const logger = {
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	info: (message: string, ...args: any[]) =>
		currentLogger.info(message, ...args),
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	warn: (message: string, ...args: any[]) =>
		currentLogger.warn(message, ...args),
	// biome-ignore lint/suspicious/noExplicitAny: Standard logger arguments
	error: (message: string | Error, ...args: any[]) =>
		currentLogger.error(message, ...args),
};
