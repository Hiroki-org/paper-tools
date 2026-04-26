"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Download,
  FileJson,
  FileText,
  GitBranch,
  Loader2,
  Network,
  Search,
} from "lucide-react";
import GraphViewer, { type CitationGraph } from "@/components/GraphViewer";
import SaveToNotionButton from "@/components/SaveToNotionButton";

type Direction = "citing" | "cited" | "both";
type InputMode = "doi" | "title" | "s2id";

const fieldClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10";

const secondaryButtonClassName =
  "inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300";

function useArchiveSavedKeys(
  selectedNode: { doi: string; title?: string } | null,
) {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const makeKeys = useCallback((doi?: string, title?: string) => {
    const keys: string[] = [];
    if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
    if (title?.trim()) keys.push(`title:${title.trim().toLowerCase()}`);
    return keys;
  }, []);

  const selectedSaved = selectedNode
    ? makeKeys(selectedNode.doi, selectedNode.title).some((key) =>
        savedKeys.has(key),
      )
    : false;

  const markSelectedSaved = useCallback(() => {
    if (!selectedNode) return;
    const keys = makeKeys(selectedNode.doi, selectedNode.title);
    if (keys.length === 0) return;

    setSavedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.add(key));
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
          if (record.doi) {
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
          }
          if (record.title) {
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
          }
        }
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

  return { savedKeys, selectedSaved, markSelectedSaved };
}

function useGraphData() {
  const [graph, setGraph] = useState<CitationGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedDoi, setResolvedDoi] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    doi: string;
    title?: string;
  } | null>(null);

  const resolveToDoi = useCallback(
    async (nextMode: InputMode, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("識別子を入力してください");
      }

      if (nextMode === "doi") {
        return trimmed.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:)/i, "");
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
          "この論文の DOI が見つかりませんでした。OpenCitations は DOI ベースのため、DOI がない論文の引用グラフは構築できません。",
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
      if (!value.trim()) return;
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

  return {
    graph,
    loading,
    error,
    setError,
    resolvedDoi,
    selectedNode,
    setSelectedNode,
    buildGraph,
  };
}

function useGraphExport(
  graph: CitationGraph | null,
  setError: (err: string | null) => void,
) {
  const [exporting, setExporting] = useState(false);

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
    [graph, setError],
  );

  return { exporting, handleExport };
}

function GraphHeader({
  stats,
  resolvedDoi,
}: {
  stats: string | null;
  resolvedDoi: string | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Citation explorer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Citation Graph
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)]">
          DOI、タイトル、Semantic Scholar ID
          から引用ネットワークを構築し、 論文の位置関係を俯瞰できます。
        </p>
      </div>

      {stats && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Current graph
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
            {stats}
          </p>
          {resolvedDoi && (
            <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--color-text-muted)]">
              DOI: {resolvedDoi}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GraphControlForm({
  mode,
  setMode,
  identifier,
  setIdentifier,
  depth,
  setDepth,
  direction,
  setDirection,
  loading,
  handleBuild,
}: {
  mode: InputMode;
  setMode: (val: InputMode) => void;
  identifier: string;
  setIdentifier: (val: string) => void;
  depth: number;
  setDepth: (val: number) => void;
  direction: Direction;
  setDirection: (val: Direction) => void;
  loading: boolean;
  handleBuild: (e: React.FormEvent) => Promise<void>;
}) {
  const inputLabel = useMemo(() => {
    if (mode === "doi") return "DOI";
    if (mode === "title") return "タイトル";
    return "Semantic Scholar ID";
  }, [mode]);

  const inputPlaceholder = useMemo(() => {
    if (mode === "doi") return "10.1145/3292500.3330672";
    if (mode === "title") return "Graph Neural Networks for...";
    return "649def34f8be52c8b66281af98ae884c09aef38b";
  }, [mode]);

  return (
    <form onSubmit={handleBuild} className="mt-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <label htmlFor="graph-mode" className="block text-sm font-semibold">
            入力モード
          </label>
          <select
            id="graph-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as InputMode)}
            disabled={loading}
            className={fieldClassName}
          >
            <option value="doi">DOI</option>
            <option value="title">タイトル</option>
            <option value="s2id">Semantic Scholar ID</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="graph-input" className="block text-sm font-semibold">
            {inputLabel}
          </label>
          <input
            id="graph-input"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={loading}
            className={fieldClassName}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            DOI が直接使える場合は最も確実です。タイトルや S2 ID は内部で DOI
            に解決してからグラフを構築します。
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[7rem_10rem_auto]">
        <div className="space-y-1.5">
          <label htmlFor="graph-depth" className="block text-sm font-semibold">
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
            className={fieldClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="graph-dir" className="block text-sm font-semibold">
            Direction
          </label>
          <select
            id="graph-dir"
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            disabled={loading}
            className={fieldClassName}
          >
            <option value="both">Both</option>
            <option value="citing">Citing</option>
            <option value="cited">Cited</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !identifier.trim()}
            className={primaryButtonClassName}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Building…
              </>
            ) : (
              <>
                <Search size={16} />
                Build Graph
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function GraphInspector({
  selectedNode,
  selectedSaved,
  markSelectedSaved,
  graph,
  exporting,
  handleExport,
}: {
  selectedNode: { doi: string; title?: string } | null;
  selectedSaved: boolean;
  markSelectedSaved: () => void;
  graph: CitationGraph | null;
  exporting: boolean;
  handleExport: (format: "json" | "dot" | "mermaid") => Promise<void>;
}) {
  return (
    <aside className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-5 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Inspector
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
        Selected node
      </h2>

      {selectedNode ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold leading-6 text-[var(--color-text)]">
              {selectedNode.title ?? "Untitled"}
            </p>
            <p className="mt-2 break-all text-xs text-[var(--color-text-muted)]">
              {selectedNode.doi}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
              className={secondaryButtonClassName}
            >
              <ArrowRight size={14} />
              DOI を開く
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-[var(--color-text-muted)]">
          グラフ上のノードをクリックすると、論文タイトル、DOI、Notion
          保存アクションをここで確認できます。
        </div>
      )}

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Export
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={!graph || exporting}
            className={secondaryButtonClassName}
          >
            <FileJson size={14} />
            JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport("dot")}
            disabled={!graph || exporting}
            className={secondaryButtonClassName}
          >
            <GitBranch size={14} />
            DOT
          </button>
          <button
            type="button"
            onClick={() => handleExport("mermaid")}
            disabled={!graph || exporting}
            className={secondaryButtonClassName}
          >
            <FileText size={14} />
            Mermaid
          </button>
        </div>
        {exporting && (
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Download size={13} />
            エクスポートを準備しています…
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Tips
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
          <li>・`both` は被引用と引用の両方向をまとめて確認できます。</li>
          <li>
            ・Depth
            を上げるほど広い文脈を見られますが、グラフは重くなります。
          </li>
          <li>・DOI がない論文は引用グラフを構築できません。</li>
        </ul>
      </div>
    </aside>
  );
}

function GraphResultView({
  graph,
  stats,
  setSelectedNode,
}: {
  graph: CitationGraph | null;
  stats: string | null;
  setSelectedNode: (node: { doi: string; title?: string } | null) => void;
}) {
  return (
    <section className="space-y-4">
      {graph ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Graph View
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                ノードを選択して引用関係を確認し、必要な論文を保存できます。
              </p>
            </div>
            {stats && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <Network size={14} />
                {stats}
              </div>
            )}
          </div>

          <GraphViewer graph={graph} onNodeTap={setSelectedNode} />
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/70 p-10 text-center shadow-sm backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[var(--color-primary)]">
            <Network size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
            グラフをまだ構築していません
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--color-text-muted)]">
            上のフォームから DOI、タイトル、または Semantic Scholar ID
            を入力して、引用ネットワークを生成してください。
          </p>
        </div>
      )}
    </section>
  );
}

function GraphPageClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<InputMode>("doi");
  const [identifier, setIdentifier] = useState("");
  const [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<Direction>("both");

  const {
    graph,
    loading,
    error,
    setError,
    resolvedDoi,
    selectedNode,
    setSelectedNode,
    buildGraph,
  } = useGraphData();
  const { exporting, handleExport } = useGraphExport(graph, setError);
  const { selectedSaved, markSelectedSaved } =
    useArchiveSavedKeys(selectedNode);

  const handleBuild = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await buildGraph(mode, identifier, depth, direction);
    },
    [mode, identifier, depth, direction, buildGraph],
  );

  useEffect(() => {
    const doi = searchParams.get("doi")?.trim();
    const title = searchParams.get("title")?.trim();
    const s2id = searchParams.get("s2id")?.trim();
    if (!doi && !title && !s2id) return;

    const nextMode: InputMode = doi ? "doi" : title ? "title" : "s2id";
    const nextIdentifier = doi ?? title ?? s2id ?? "";
    setMode(nextMode);
    setIdentifier(nextIdentifier);
    void buildGraph(nextMode, nextIdentifier, depth, direction);
  }, [searchParams, buildGraph, depth, direction]);

  const stats = graph
    ? `${graph.nodes.length} nodes · ${graph.edges.length} edges`
    : null;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm backdrop-blur">
          <GraphHeader stats={stats} resolvedDoi={resolvedDoi} />

          <GraphControlForm
            mode={mode}
            setMode={setMode}
            identifier={identifier}
            setIdentifier={setIdentifier}
            depth={depth}
            setDepth={setDepth}
            direction={direction}
            setDirection={setDirection}
            loading={loading}
            handleBuild={handleBuild}
          />

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <GraphInspector
          selectedNode={selectedNode}
          selectedSaved={selectedSaved}
          markSelectedSaved={markSelectedSaved}
          graph={graph}
          exporting={exporting}
          handleExport={handleExport}
        />
      </section>

      <GraphResultView
        graph={graph}
        stats={stats}
        setSelectedNode={setSelectedNode}
      />
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
