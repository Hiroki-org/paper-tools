"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import GraphViewer, { type CitationGraph } from "@/components/GraphViewer";
import SaveToNotionButton from "@/components/SaveToNotionButton";

type Direction = "citing" | "cited" | "both";
type InputMode = "doi" | "title" | "s2id";

function GraphPageClient() {
  const searchParams = useSearchParams();
  const initializedByUrl = useRef(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<InputMode>("doi");
  const [identifier, setIdentifier] = useState("");
  const [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<Direction>("both");
  const [graph, setGraph] = useState<CitationGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    doi: string;
    title?: string;
  } | null>(null);

  const makeKeys = useCallback((doi?: string, title?: string) => {
    const keys: string[] = [];
    if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
    if (title?.trim()) keys.push(`title:${title.trim().toLowerCase()}`);
    return keys;
  }, []);

  const selectedSaved = selectedNode
    ? makeKeys(selectedNode.doi, selectedNode.title).some((k) =>
        savedKeys.has(k),
      )
    : false;

  const markSelectedSaved = useCallback(() => {
    if (!selectedNode) return;
    const keys = makeKeys(selectedNode.doi, selectedNode.title);
    if (keys.length === 0) return;
    setSavedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  }, [selectedNode, makeKeys]);

  useEffect(() => {
    let cancelled = false;
    const fetchArchive = async () => {
      try {
        const res = await fetch("/api/archive");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const next = new Set<string>();
        for (const record of data.records ?? []) {
          if (record.doi)
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
          if (record.title)
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
        }
        setSavedKeys(next);
      } catch {}
    };
    void fetchArchive();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveToDoi = useCallback(
    async (nextMode: InputMode, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("識別子を入力してください");
      }

      if (nextMode === "doi") {
        return trimmed;
      }

      const body =
        nextMode === "title" ? { title: trimmed } : { s2Id: trimmed };
      const resolveRes = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resolveData = await resolveRes.json();
      if (!resolveRes.ok) {
        throw new Error(resolveData.error ?? "論文の解決に失敗しました");
      }

      const doi = resolveData.paper?.externalIds?.DOI as string | undefined;
      if (!doi) {
        throw new Error(
          "この論文の DOI が見つかりませんでした。OpenCitations は DOI ベースのため，DOI がない論文の引用グラフは構築できません。",
        );
      }

      return doi;
    },
    [],
  );

  const buildGraph = useCallback(
    async (
      nextMode: InputMode,
      value: string,
      nextDepth: number,
      nextDirection: Direction,
    ) => {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      try {
        const doi = await resolveToDoi(nextMode, value);
        setResolvedDoi(doi);
        const params = new URLSearchParams({
          doi,
          depth: String(nextDepth),
          direction: nextDirection,
        });
        const res = await fetch(`/api/graph?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Build failed");
        setGraph(data.graph);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setGraph(null);
        setResolvedDoi(null);
      } finally {
        setLoading(false);
      }
    },
    [resolveToDoi],
  );

  const handleBuild = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await buildGraph(mode, identifier, depth, direction);
    },
    [mode, identifier, depth, direction, buildGraph],
  );

  useEffect(() => {
    if (initializedByUrl.current) return;

    const doi = searchParams.get("doi")?.trim();
    const title = searchParams.get("title")?.trim();
    const s2id = searchParams.get("s2id")?.trim();
    if (!doi && !title && !s2id) return;

    const nextMode: InputMode = doi ? "doi" : title ? "title" : "s2id";
    const nextIdentifier = doi ?? title ?? s2id ?? "";
    initializedByUrl.current = true;
    setMode(nextMode);
    setIdentifier(nextIdentifier);
    void buildGraph(nextMode, nextIdentifier, depth, direction);
  }, [searchParams, buildGraph, depth, direction]);

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
        const ext =
          format === "mermaid" ? "md" : format === "dot" ? "gv" : "json";
        a.download = `graph.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setExporting(false);
      }
    },
    [graph],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Citation Graph</h1>

      <form onSubmit={handleBuild} className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label
            htmlFor="graph-mode"
            className="mb-1 block text-sm font-medium"
          >
            入力モード
          </label>
          <select
            id="graph-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as InputMode)}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="doi">DOI</option>
            <option value="title">タイトル</option>
            <option value="s2id">Semantic Scholar ID</option>
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="graph-input"
            className="mb-1 block text-sm font-medium"
          >
            {mode === "doi"
              ? "DOI"
              : mode === "title"
                ? "タイトル"
                : "Semantic Scholar ID"}
          </label>
          <input
            id="graph-input"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              mode === "doi"
                ? "10.1145/3292500.3330672"
                : mode === "title"
                  ? "Graph Neural Networks..."
                  : "649def34f8be52c8b66281af98ae884c09aef38b"
            }
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <div className="w-24">
          <label
            htmlFor="graph-depth"
            className="mb-1 block text-sm font-medium"
          >
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
          disabled={loading || !identifier.trim()}
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
            {resolvedDoi && (
              <span className="text-xs text-gray-400">DOI: {resolvedDoi}</span>
            )}
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

          <GraphViewer graph={graph} onNodeTap={setSelectedNode} />

          {selectedNode && (
            <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h2 className="text-sm font-semibold">選択ノード</h2>
              <p className="text-sm text-[var(--color-text)]">
                {selectedNode.title ?? "Untitled"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] break-all">
                {selectedNode.doi}
              </p>
              <div className="flex items-center gap-2">
                <SaveToNotionButton
                  doi={selectedNode.doi}
                  title={selectedNode.title}
                  saved={selectedSaved}
                  onSaved={markSelectedSaved}
                />
                <a
                  href={`https://doi.org/${encodeURIComponent(selectedNode.doi)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  DOIを開く
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-[var(--color-text-muted)]">
          Loading graph page...
        </div>
      }
    >
      <GraphPageClient />
    </Suspense>
  );
}
