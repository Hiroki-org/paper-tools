import { AlertCircle, CheckCircle2 } from "lucide-react";

type PropertyWarningsProps = {
	warnings: string[];
	showWarnings: boolean;
	handleContinue: () => void;
};

export function PropertyWarnings({
	warnings,
	showWarnings,
	handleContinue,
}: PropertyWarningsProps) {
	if (warnings.length === 0 || !showWarnings) return null;

	return (
		<div className="rounded-3xl border border-amber-100 bg-amber-50 p-8 shadow-sm">
			<div className="mb-4 flex items-center gap-3 text-amber-900">
				<AlertCircle size={24} className="text-amber-500" />
				<h2 className="text-lg font-bold">プロパティ警告</h2>
			</div>
			<p className="mb-4 text-sm leading-relaxed text-amber-800">
				選択したデータベースに以下のプロパティが不足しています。続行できますが、一部の機能が正常に動作しない可能性があります。
			</p>
			<ul className="mb-8 grid gap-2 sm:grid-cols-2">
				{warnings.map((w) => (
					<li
						key={w}
						className="flex items-center gap-2 text-xs font-semibold text-amber-700"
					>
						<span className="h-1 w-1 rounded-full bg-amber-400" />
						{w}
					</li>
				))}
			</ul>
			<button
				type="button"
				onClick={handleContinue}
				className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-700"
			>
				<CheckCircle2 size={18} />
				理解して続行
			</button>
		</div>
	);
}
