import { type FormEvent, useEffect, useState } from "react";
import type { DatabaseItem } from "../types";

export function useSetupPage() {
	const [items, setItems] = useState<DatabaseItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectingId, setSelectingId] = useState<string | null>(null);
	const [manualDatabaseId, setManualDatabaseId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [warnings, setWarnings] = useState<string[]>([]);
	const [showWarnings, setShowWarnings] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/databases", { cache: "no-store" });
				const data = await res.json();
				if (res.status === 401) {
					window.location.href = "/login";
					return;
				}
				if (!res.ok)
					throw new Error(data.error ?? "データベース取得に失敗しました");
				if (!cancelled) setItems(data.databases ?? []);
			} catch (err) {
				if (!cancelled)
					setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectDatabase = async (databaseId: string) => {
		setSelectingId(databaseId);
		setWarnings([]);
		setError(null);
		setShowWarnings(false);
		try {
			const res = await fetch("/api/databases/select", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ databaseId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "DB選択に失敗しました");

			const newWarnings = data.warnings ?? [];
			setWarnings(newWarnings);

			if (newWarnings.length === 0) {
				window.location.href = "/";
			} else {
				setShowWarnings(true);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setSelectingId(null);
		}
	};

	const extractDatabaseId = (input: string) => {
		const trimmed = input.trim();
		const match = trimmed.match(/[0-9a-fA-F]{32}/);
		if (match) return match[0];
		return trimmed;
	};

	const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const databaseId = extractDatabaseId(manualDatabaseId);
		if (!databaseId) {
			setError("Database ID を入力してください");
			return;
		}
		await selectDatabase(databaseId);
	};

	const handleContinue = () => {
		setShowWarnings(false);
		setWarnings([]);
		window.location.href = "/";
	};

	return {
		items,
		loading,
		selectingId,
		manualDatabaseId,
		setManualDatabaseId,
		error,
		warnings,
		showWarnings,
		handleManualSubmit,
		handleContinue,
		selectDatabase,
	};
}
