export interface Logger {
	log(message: string): void;
	table(data: unknown): void;
}

export const defaultLogger: Logger = {
	log: (message: string) => {
		process.stdout.write(message);
	},
	table: (data: unknown) => {
		console.table(data);
	},
};
