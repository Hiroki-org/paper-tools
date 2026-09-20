import { CheckCircle2, Database, RefreshCw } from "lucide-react";
import Image from "next/image";
import type { DatabaseItem } from "../types";

type AvailableDatabasesProps = {
	items: DatabaseItem[];
	loading: boolean;
	selectingId: string | null;
	selectDatabase: (databaseId: string) => Promise<void>;
};

export function AvailableDatabases({
	items,
	loading,
	selectingId,
	selectDatabase,
}: AvailableDatabasesProps) {
	return (
		<div className="space-y-6">
			<h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
				<Database size={16} />
				利用可能なデータベース
			</h2>

			{loading ? (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-48 animate-pulse rounded-3xl bg-slate-100"
						/>
					))}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center">
					<Database size={48} className="mx-auto mb-4 text-slate-200" />
					<p className="text-lg font-bold text-slate-400">
						利用可能なデータベースが見つかりませんでした
					</p>
					<p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
						Notion 側で共有設定を確認するか、上の入力欄から ID
						を直接入力してください。
					</p>
				</div>
			) : (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
						>
							<div className="mb-4 flex items-center gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-xl shadow-inner transition-colors group-hover:bg-blue-50">
									{item.icon &&
									typeof item.icon === "string" &&
									item.icon.startsWith("http") ? (
										<Image
											src={item.icon}
											alt={item.title}
											width={24}
											height={24}
											className="h-6 w-6 rounded"
										/>
									) : item.icon ? (
										item.icon
									) : (
										<Database
											size={20}
											className="text-slate-400 group-hover:text-blue-500"
										/>
									)}
								</div>
								<h3 className="line-clamp-2 font-bold text-slate-900 leading-tight">
									{item.title}
								</h3>
							</div>
							<p className="mb-6 line-clamp-2 text-sm text-slate-500 leading-relaxed">
								{item.description || "説明なし"}
							</p>
							<div className="mt-auto">
								<button
									type="button"
									onClick={() => void selectDatabase(item.id)}
									disabled={Boolean(selectingId)}
									className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-xs font-bold text-slate-600 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-50"
								>
									{selectingId === item.id ? (
										<RefreshCw size={14} className="animate-spin" />
									) : (
										<CheckCircle2 size={14} />
									)}
									{selectingId === item.id ? "設定中…" : "このDBを使用"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
