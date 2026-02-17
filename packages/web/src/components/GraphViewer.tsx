"use client";

import { useEffect, useRef, useCallback } from "react";
import type cytoscape from "cytoscape";
import { Network, Maximize } from "lucide-react";

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
          label: n.title
            ? (Array.from(n.title).length > 20
              ? Array.from(n.title).slice(0, 20).join("") + "…"
              : n.title)
            : n.doi,
          fullTitle: n.title ?? n.doi,
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
            "background-color": "#3b82f6", // var(--color-primary)
            color: "#64748b",             // var(--color-text-muted)
            "font-size": "11px",
            "font-weight": "bold",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-wrap": "wrap" as any,
            "text-max-width": "120px",
            width: 32,
            height: 32,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#cbd5e1",      // slate-300
            "target-arrow-color": "#cbd5e1",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.8,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#2563eb", // primary-hover
            "border-width": 3,
            "border-color": "#bfdbfe",    // blue-200
            width: 40,
            height: 40,
            "font-size": "12px",
            color: "#0f172a",             // text-main
          },
        },
        {
          selector: "node:active",
          style: {
            "overlay-opacity": 0.1,
            "overlay-color": "#3b82f6",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 800,
        padding: 50,
        componentSpacing: 100,
        nodeRepulsion: (node: any) => 400000,
      } as any,
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data() as { doi?: string; title?: string };
      const doi = data.doi ?? evt.target.id();
      onNodeTap?.({ doi, title: data.title });
    });

    // Add hover effect (guard containerRef)
    cy.on("mouseover", "node", (evt) => {
      if (containerRef.current) containerRef.current.style.cursor = "pointer";
    });

    cy.on("mouseout", "node", (evt) => {
      if (containerRef.current) containerRef.current.style.cursor = "default";      });

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
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
        style={{ height }}
      >
        <div className="rounded-full bg-white p-4 shadow-sm mb-3">
          <Network className="text-slate-400" size={32} />
        </div>
        <p className="font-medium">No graph data</p>
        <p className="mt-1 text-xs text-slate-400">Enter a DOI or search term to build a citation graph.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden"
      style={{ height }}
    >
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
         <button
           className="rounded bg-white p-2 shadow-md hover:bg-slate-50 text-slate-600 border border-slate-100 transition-colors"
           onClick={() => cyRef.current?.fit()}
           title="Fit to screen"
         >
           <Maximize size={18} />
         </button>
      </div>
    </div>
  );
}
