"use client";

import { useState, useCallback } from "react";
import GraphViewer, { type CitationGraph } from "@/components/GraphViewer";

type Direction = "citing" | "cited" | "both";

export default function GraphPage() {
  const [doi, setDoi] = useState("");
  const [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<Direction>("both");
  const [graph, setGraph] = useState<CitationGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleBuild = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!doi.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          doi: doi.trim(),
          depth: String(depth),
          direction,
        });
        const res = await fetch(`/api/graph?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Build failed");
        setGraph(data.graph);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setGraph(null);
      } finally {
        setLoading(false);
      }
    },
    [doi, depth, direction]
  );

  const handleExport = useCallback(
    async (format: "json" | "dot" | "mermaid") => {
      if (!graph) return;
      setExporting(true);
      try {
        const res = await fetch("/api/graph/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graph, format }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Export failed");

        // Download as file
        const blob = new Blob([data.output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "mermaid" ? "md" : format === "dot" ? "gv" : "json";
        a.download = `graph.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setExporting(false);
      }
    },
    [graph]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Citation Graph</h1>

      <form onSubmit={handleBuild} className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="graph-doi" className="mb-1 block text-sm font-medium">
            DOI
          </label>
          <input
            id="graph-doi"
            type="text"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            placeholder="10.1145/3292500.3330672"
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <div className="w-24">
          <label htmlFor="graph-depth" className="mb-1 block text-sm font-medium">
            Depth
          </label>
          <input
            id="graph-depth"
            type="number"
            min={1}
            max={3}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="w-32">
          <label htmlFor="graph-dir" className="mb-1 block text-sm font-medium">
            Direction
          </label>
          <select
            id="graph-dir"
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="both">Both</option>
            <option value="citing">Citing</option>
            <option value="cited">Cited</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !doi.trim()}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Building…" : "Build Graph"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {graph && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
            <div className="ml-auto flex gap-2">
              {(["json", "dot", "mermaid"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  disabled={exporting}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Export {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <GraphViewer graph={graph} />
        </>
      )}
    </div>
  );
}
