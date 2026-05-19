import type { Paper } from "@paper-tools/core";

export interface DrilldownBody {
	seedPapers: Paper[];
	depth?: number;
	maxPerLevel?: number;
	enrich?: boolean;
}
