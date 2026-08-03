import { Info, LayoutGrid } from "lucide-react";
import type { FormEvent } from "react";

type ManualDatabaseFormProps = {
	manualDatabaseId: string;
	setManualDatabaseId: (value: string) => void;
	selectingId: string | null;
	handleManualSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ManualDatabaseForm({
	manualDatabaseId,
	setManualDatabaseId,
	selectingId,
	handleManualSubmit,
}: ManualDatabaseFormProps) {
	return (
		<section className="rounded-[2rem] border border-white/20 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
			<h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
				<LayoutGrid size={16} />
				データベースを直接指定
			</h2>
			<form
				onSubmit={(event) => void handleManualSubmit(event)}
				className="relative"
			>
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="relative flex-1">
						<input
							id="database-id"
							value={manualDatabaseId}
							onChange={(event) => setManualDatabaseId(event.target.value)}
							placeholder="Database ID または URL を入力…"
							className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm shadow-inner transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
						/>
					</div>
					<button
						type="submit"
						disabled={Boolean(selectingId)}
						className="h-14 rounded-2xl bg-blue-600 px-8 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 sm:w-auto"
					>
						{selectingId ? "設定中…" : "IDで設定"}
					</button>
				</div>
				<p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
					<Info size={12} />
					例: 38befc4ff83547e2a94e9332e4a81aa5
				</p>
			</form>
		</section>
	);
}
