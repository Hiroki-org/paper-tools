import { getCitations, getReferences } from "@paper-tools/core";

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
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    // 起点ノードを追加
    nodeMap.set(doi.toLowerCase(), { doi: doi.toLowerCase() });

    let frontier = [doi.toLowerCase()];

    for (let d = 0; d < depth; d++) {
        const nextFrontier: string[] = [];

        for (const currentDoi of frontier) {
            const citations: Array<{ source: string; target: string; creationDate?: string }> = [];

            if (direction === "citing" || direction === "both") {
                const citing = await getCitations(currentDoi);
                for (const c of citing) {
                    citations.push({
                        source: c.citing.toLowerCase(),
                        target: c.cited.toLowerCase(),
                        creationDate: c.creationDate,
                    });
                }
            }

            if (direction === "cited" || direction === "both") {
                const refs = await getReferences(currentDoi);
                for (const r of refs) {
                    citations.push({
                        source: r.citing.toLowerCase(),
                        target: r.cited.toLowerCase(),
                        creationDate: r.creationDate,
                    });
                }
            }

            for (const c of citations) {
                const edgeKey = `${c.source}->${c.target}`;
                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    edges.push({ source: c.source, target: c.target, creationDate: c.creationDate });
                }

                // 新しいノードをフロンティアへ
                for (const nodeDoi of [c.source, c.target]) {
                    if (!nodeMap.has(nodeDoi)) {
                        nodeMap.set(nodeDoi, { doi: nodeDoi });
                        nextFrontier.push(nodeDoi);
                    }
                }
            }
        }

        frontier = nextFrontier;
        if (frontier.length === 0) break;
    }

    return { nodes: Array.from(nodeMap.values()), edges };
}

/**
 * 複数のグラフをマージする。
 */
export function mergeGraphs(...graphs: CitationGraph[]): CitationGraph {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    for (const g of graphs) {
        for (const node of g.nodes) {
            const key = node.doi.toLowerCase();
            const existing = nodeMap.get(key);
            if (!existing) {
                nodeMap.set(key, { ...node, doi: key });
            } else if (!existing.title && node.title) {
                existing.title = node.title;
            }
        }
        for (const edge of g.edges) {
            const edgeKey = `${edge.source}->${edge.target}`;
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                edges.push(edge);
            }
        }
    }

    return { nodes: Array.from(nodeMap.values()), edges };
}
