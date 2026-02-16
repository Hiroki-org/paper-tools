"use client";

import { useEffect, useRef, useCallback } from "react";
import type cytoscape from "cytoscape";

/** Minimal node / edge shapes matching visualizer output */
interface GraphNode {
  doi: string;
  title?: string;
}
interface GraphEdge {
  source: string;
  target: string;
  creationDate?: string;
}
export interface CitationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphViewerProps {
  graph: CitationGraph;
  /** Height of the canvas. Default 600 */
  height?: number;
  /** Called when a node is tapped */
  onNodeTap?: (node: { doi: string; title?: string }) => void;
}

export default function GraphViewer({
  graph,
  height = 600,
  onNodeTap,
}: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const initGraph = useCallback(async () => {
    if (!containerRef.current) return;

    // Dynamic import so cytoscape is only loaded on the client
    const cytoscape = (await import("cytoscape")).default;

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements: cytoscape.ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: {
          id: n.doi,
          doi: n.doi,
          title: n.title,
          label: n.title ?? n.doi,
        },
      })),
      ...graph.edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#6366f1",
            color: "#111827",
            "font-size": "10px",
            "text-wrap": "wrap" as any,
            "text-max-width": "120px",
            width: 28,
            height: 28,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#a5b4fc",
            "target-arrow-color": "#6366f1",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: "node:active",
          style: {
            "overlay-opacity": 0.2,
          },
        },
      ],
      layout: { name: "cose", animate: true, animationDuration: 600 } as any,
      minZoom: 0.2,
      maxZoom: 5,
    });

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data() as { doi?: string; title?: string };
      const doi = data.doi ?? evt.target.id();
      onNodeTap?.({ doi, title: data.title });
    });

    cyRef.current = cy;
  }, [graph, onNodeTap]);

  useEffect(() => {
    initGraph();
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [initGraph]);

  if (graph.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--color-border)] text-sm text-gray-400"
        style={{ height }}
      >
        No graph data. Enter a DOI above to build a citation graph.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg border border-[var(--color-border)]"
      style={{ height }}
    />
  );
}
