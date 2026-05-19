export interface Logger {
	/**
	 * Writes a message to stdout.
	 * Include any required newline characters in the message.
	 */
	log(message: string): void;
	table(data: unknown): void;
	error(message: string): void;
}

export const defaultLogger: Logger = {
	log: (message: string) => {
		process.stdout.write(message);
	},
	table: (data: unknown) => {
		console.table(data);
	},
	error: (message: string) => {
		console.error(message);
	},
};
