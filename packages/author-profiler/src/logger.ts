export interface Logger {
	log(message: string): void;
	table(data: any): void;
	error(message: string): void;
}

export const defaultLogger: Logger = {
	log: (message: string) => {
		process.stdout.write(message);
	},
	table: (data: any) => {
		console.table(data);
	},
	error: (message: string) => {
		console.error(message);
	},
};
