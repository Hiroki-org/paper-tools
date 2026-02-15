import { NextRequest, NextResponse } from "next/server";
import { toJson, toDot, toMermaid } from "@paper-tools/visualizer";
import type { CitationGraph } from "@paper-tools/visualizer";

interface ExportBody {
  graph: CitationGraph;
  format: "json" | "dot" | "mermaid";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportBody;
    const { graph, format } = body;

    if (!graph || !format) {
      return NextResponse.json(
        { error: "graph and format are required" },
        { status: 400 },
      );
    }

    let output: string;
    switch (format) {
      case "json":
        output = toJson(graph);
        break;
      case "dot":
        output = toDot(graph);
        break;
      case "mermaid":
        output = toMermaid(graph);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}. Use json, dot, or mermaid.` },
          { status: 400 },
        );
    }

    return NextResponse.json({ output, format });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
