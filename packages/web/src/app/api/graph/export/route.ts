import { NextRequest, NextResponse } from "next/server";
import { formatGraph, SUPPORTED_FORMATS } from "@paper-tools/visualizer";
import type { CitationGraph, Format } from "@paper-tools/visualizer";

interface ExportBody {
  graph: CitationGraph;
  format: Format;
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

    if (!(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}. Use ${SUPPORTED_FORMATS.join(", ")}.` },
        { status: 400 },
      );
    }

    const output = formatGraph(graph, format);

    return NextResponse.json({ output, format });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
