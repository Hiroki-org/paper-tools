export interface Logger {
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
