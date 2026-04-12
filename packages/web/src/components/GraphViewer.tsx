"use client";

import { useCallback, useEffect, useRef } from "react";
import type cytoscape from "cytoscape";
import { Maximize, Network } from "lucide-react";

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

const CYTOSCAPE_STYLE: cytoscape.StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "#2563eb",
      color: "#475569",
      "font-size": "11px",
      "font-weight": 600,
      "text-valign": "bottom",
      "text-margin-y": 8,
      "text-wrap": "wrap" as unknown as "wrap",
      "text-max-width": "132px",
      width: 34,
      height: 34,
      "border-width": 2,
      "border-color": "#ffffff",
      "overlay-padding": 6,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "#cbd5e1",
      "target-arrow-color": "#cbd5e1",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      opacity: 0.9,
    },
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#1d4ed8",
      "border-width": 4,
      "border-color": "#bfdbfe",
      width: 42,
      height: 42,
      "font-size": "12px",
      color: "#0f172a",
    },
  },
];

const CYTOSCAPE_LAYOUT: cytoscape.LayoutOptions = {
  name: "cose",
  animate: true,
  animationDuration: 700,
  padding: 50,
  componentSpacing: 100,
  nodeRepulsion: () => 400000,
} as cytoscape.LayoutOptions;

function buildElements(graph: CitationGraph): cytoscape.ElementDefinition[] {
  return [
    ...graph.nodes.map((node) => ({
      data: {
        id: node.doi,
        doi: node.doi,
        title: node.title,
        label: node.title
          ? Array.from(node.title).length > 22
            ? `${Array.from(node.title).slice(0, 22).join("")}…`
            : node.title
          : node.doi,
        fullTitle: node.title ?? node.doi,
      },
    })),
    ...graph.edges.map((edge, index) => ({
      data: {
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
      },
    })),
  ];
}

function setupEvents(
  cy: cytoscape.Core,
  container: HTMLDivElement,
  onNodeTap?: (node: { doi: string; title?: string }) => void,
) {
  cy.on("tap", "node", (event) => {
    const data = event.target.data() as { doi?: string; title?: string };
    const doi = data.doi ?? event.target.id();
    onNodeTap?.({ doi, title: data.title });
  });

  cy.on("mouseover", "node", () => {
    container.style.cursor = "pointer";
  });

  cy.on("mouseout", "node", () => {
    container.style.cursor = "default";
  });
}

function EmptyGraphState({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-6 text-center text-sm text-slate-500"
      style={{ height }}
    >
      <div className="mb-4 rounded-full border border-slate-200 bg-white p-4 shadow-sm">
        <Network className="text-slate-400" size={32} />
      </div>
      <p className="text-base font-semibold text-slate-700">
        No graph data yet
      </p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Enter a DOI, title, or Semantic Scholar ID to build a citation graph
        and explore how papers connect.
      </p>
    </div>
  );
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

    const cytoscape = (await import("cytoscape")).default;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements = buildElements(graph);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: CYTOSCAPE_STYLE,
      layout: CYTOSCAPE_LAYOUT,
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    setupEvents(cy, containerRef.current, onNodeTap);

    cyRef.current = cy;
  }, [graph, onNodeTap]);

  useEffect(() => {
    void initGraph();

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [initGraph]);

  if (graph.nodes.length === 0) {
    return <EmptyGraphState height={height} />;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm"
      style={{ height }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.14) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur">
        Click a node to inspect its DOI and save it to Notion.
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          onClick={() => cyRef.current?.fit()}
          title="Fit to screen"
        >
          <Maximize size={14} />
          Fit
        </button>
      </div>

      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
