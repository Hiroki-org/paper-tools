import { getCitations, getReferences, mapWithConcurrency } from "@paper-tools/core";

/**
 * グラフのノード（論文）
 */
export interface GraphNode {
    doi: string;
    /** Crossref / DBLP などで取得できた場合のみ */
    title?: string;
}

/**
 * グラフのエッジ（引用関係）
 */
export interface GraphEdge {
    /** 引用元 DOI */
    source: string;
    /** 引用先 DOI */
    target: string;
    /** 引用日 */
    creationDate?: string;
}

/**
 * 引用グラフ
 */
export interface CitationGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export type Direction = "citing" | "cited" | "both";

/**
 * 指定 DOI を起点に引用グラフを構築する。
 *
 * @param doi       起点の DOI
 * @param depth     探索の深さ（デフォルト 1）
 * @param direction "citing" = 被引用, "cited" = 引用先, "both" = 両方
 */
export async function buildCitationGraph(
    doi: string,
    depth = 1,
    direction: Direction = "both",
): Promise<CitationGraph> {
    const nodeSet = new Set<string>();
    const nodes: GraphNode[] = [];
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    // 起点ノードを追加
    nodeSet.add(doi.toLowerCase());
    nodes.push({ doi: doi.toLowerCase() });

    let frontier = [doi.toLowerCase()];

    for (let d = 0; d < depth; d++) {
        const nextFrontier: string[] = [];

        // Fetch all citations for the current frontier with bounded concurrency (e.g., 10)
        const results = await mapWithConcurrency(
            frontier,
            async (currentDoi) => {
                const citations: Array<{ source: string; target: string; creationDate?: string }> = [];
                try {
                    const [citing, refs] = await Promise.all([
                        direction === "citing" || direction === "both" ? getCitations(currentDoi) : Promise.resolve([]),
                        direction === "cited" || direction === "both" ? getReferences(currentDoi) : Promise.resolve([])
                    ]);

                    for (const c of citing) {
                        citations.push({
                            source: c.citing.toLowerCase(),
                            target: c.cited.toLowerCase(),
                            creationDate: c.creationDate,
                        });
                    }
                    for (const r of refs) {
                        citations.push({
                            source: r.citing.toLowerCase(),
                            target: r.cited.toLowerCase(),
                            creationDate: r.creationDate,
                        });
                    }
                    return { citations, currentDoi };
                } catch (error) {
                    const errorDetail = error instanceof Error ? error.message : String(error);
                    console.error("[visualizer] Failed to fetch citations", {
                        doi: currentDoi,
                        error: errorDetail,
                    });
                    return { citations: [], currentDoi, error };
                }
            },
            10 // Limit concurrency to avoid too many simultaneous requests
        );

        for (const result of results) {
            const { citations, currentDoi, error } = result;
            if (error) continue;


            for (const c of citations) {
                const edgeKey = `${c.source}->${c.target}`;
                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    edges.push({ source: c.source, target: c.target, creationDate: c.creationDate });
                }

                // 新しいノードをフロンティアへ
                for (const nodeDoi of [c.source, c.target]) {
                    if (!nodeSet.has(nodeDoi)) {
                        nodeSet.add(nodeDoi);
                        nodes.push({ doi: nodeDoi });
                        nextFrontier.push(nodeDoi);
                    }
                }
            }
        }

        frontier = nextFrontier;
        if (frontier.length === 0) break;
    }

    return { nodes, edges };
}

/**
 * 複数のグラフをマージする。
 */
export function mergeGraphs(...graphs: CitationGraph[]): CitationGraph {
    const nodeMap = new Map<string, GraphNode>();
    const nodes: GraphNode[] = [];
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    for (const g of graphs) {
        for (const node of g.nodes) {
            const key = node.doi.toLowerCase();
            const existing = nodeMap.get(key);
            if (!existing) {
                const newNode = { ...node, doi: key };
                nodeMap.set(key, newNode);
                nodes.push(newNode);
            } else if (!existing.title && node.title) {
                existing.title = node.title;
            }
        }
        for (const edge of g.edges) {
            const normalizedSource = edge.source.toLowerCase();
            const normalizedTarget = edge.target.toLowerCase();
            const edgeKey = `${normalizedSource}->${normalizedTarget}`;
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                edges.push({
                    source: normalizedSource,
                    target: normalizedTarget,
                    creationDate: edge.creationDate,
                });
            }
        }
    }

    return { nodes, edges };
}
