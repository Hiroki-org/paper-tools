import type { Paper } from "@paper-tools/core";
import { useCallback, useEffect, useState } from "react";

export function useSavedPapers() {
	const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

	const makeKeys = useCallback((doi?: string, title?: string) => {
		const keys: string[] = [];
		if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
		if (title?.trim()) keys.push(`title:${title.trim().toLowerCase()}`);
		return keys;
	}, []);

	const isSaved = useCallback(
		(paper: Paper) =>
			makeKeys(paper.doi, paper.title).some((k) => savedKeys.has(k)),
		[makeKeys, savedKeys],
	);

	const markSaved = useCallback(
		(paper: Paper) => {
			const keys = makeKeys(paper.doi, paper.title);
			if (keys.length === 0) return;
			setSavedKeys((prev) => {
				const next = new Set(prev);
				keys.forEach((k) => next.add(k));
				return next;
			});
		},
		[makeKeys],
	);

	useEffect(() => {
		let cancelled = false;
		const fetchArchive = async () => {
			try {
				const res = await fetch("/api/archive");
				const data = await res.json();
				if (!res.ok || cancelled) return;
				const next = new Set<string>(
					(data.records ?? []).reduce(
						(acc: string[], record: Partial<Paper>) => {
							if (record.doi)
								acc.push(`doi:${String(record.doi).trim().toLowerCase()}`);
							if (record.title)
								acc.push(`title:${String(record.title).trim().toLowerCase()}`);
							return acc;
						},
						[],
					),
				);
				setSavedKeys(next);
			} catch (err) {
				if (process.env.NODE_ENV === "development") {
					console.warn("Failed to fetch archive:", err);
				}
			}
		};
		void fetchArchive();
		return () => {
			cancelled = true;
		};
	}, []);

	return { isSaved, markSaved };
}
