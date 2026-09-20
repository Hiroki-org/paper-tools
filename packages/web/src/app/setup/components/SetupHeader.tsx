import { Database, ExternalLink, RefreshCw } from "lucide-react";

export function SetupHeader() {
	return (
		<header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div className="space-y-2">
				<div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
					<Database size={12} />
					Setup
				</div>
				<h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
					Notion データベースを選択
				</h1>
				<p className="max-w-2xl text-base text-slate-500">
					一覧から選択するか、Database ID / URL
					を直接入力して保存先を設定してください。
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-3">
				<a
					href="https://www.notion.so/my-connections"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
				>
					<ExternalLink size={14} className="text-slate-400" />
					Notion設定
				</a>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
				>
					<RefreshCw size={14} />
					ページを再読み込み
				</button>
			</div>
		</header>
	);
}
