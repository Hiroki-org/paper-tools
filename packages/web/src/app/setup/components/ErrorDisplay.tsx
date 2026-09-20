import { AlertCircle } from "lucide-react";

type ErrorDisplayProps = {
	error: string | null;
};

export function ErrorDisplay({ error }: ErrorDisplayProps) {
	if (!error) return null;

	return (
		<div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
			<div className="flex items-center gap-3">
				<AlertCircle size={20} className="text-red-500" />
				<p className="font-bold">{error}</p>
			</div>
		</div>
	);
}
