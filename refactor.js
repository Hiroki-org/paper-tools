const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "packages/web/src/app/graph/page.tsx");
let content = fs.readFileSync(p, "utf-8");

const hooksCode = `
function useArchiveSavedKeys(selectedNode: { doi: string; title?: string; } | null) {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const makeKeys = useCallback((doi?: string, title?: string) => {
    const keys: string[] = [];
    if (doi?.trim()) keys.push(\`doi:\${doi.trim().toLowerCase()}\`);
    if (title?.trim()) keys.push(\`title:\${title.trim().toLowerCase()}\`);
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
            next.add(\`doi:\${String(record.doi).trim().toLowerCase()}\`);
          if (record.title)
            next.add(\`title:\${String(record.title).trim().toLowerCase()}\`);
        }
        setSavedKeys(next);
      } catch (err) { }
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
        const res = await fetch(\`/api/graph?\${params}\`);
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

  return { graph, loading, error, setError, resolvedDoi, selectedNode, setSelectedNode, buildGraph };
}

function useGraphExport(graph: CitationGraph | null, setError: (err: string | null) => void) {
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

        // Download as file
        const blob = new Blob([data.output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext =
          format === "mermaid" ? "md" : format === "dot" ? "gv" : "json";
        a.download = \`graph.\${ext}\`;
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

function GraphPageClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<InputMode>("doi");
  const [identifier, setIdentifier] = useState("");
  const [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<Direction>("both");

  const { graph, loading, error, setError, resolvedDoi, selectedNode, setSelectedNode, buildGraph } = useGraphData();
  const { exporting, handleExport } = useGraphExport(graph, setError);
  const { selectedSaved, markSelectedSaved } = useArchiveSavedKeys(selectedNode);

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

  return (`;

const startIdx = content.indexOf("function GraphPageClient() {");
const endIdx = content.indexOf("return (\n    <div className=\"space-y-6\">");

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end index");
  process.exit(1);
}

const newContent = content.substring(0, startIdx) + hooksCode + "\n    <div className=\"space-y-6\">" + content.substring(endIdx + 41);

fs.writeFileSync(p, newContent);
console.log("Refactored " + p);
