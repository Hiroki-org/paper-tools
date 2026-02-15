import { NextRequest, NextResponse } from "next/server";
import { getPaper, searchPapers } from "@paper-tools/core";

interface ResolveBody {
  doi?: string;
  title?: string;
  s2Id?: string;
}

function normalizeDoi(input: string) {
  return input.replace(/^DOI:/i, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveBody;
    const doi = body.doi?.trim();
    const title = body.title?.trim();
    const s2Id = body.s2Id?.trim();

    if (!doi && !title && !s2Id) {
      return NextResponse.json(
        { error: "doi, title, s2Id のいずれか1つが必要です" },
        { status: 400 },
      );
    }

    if (doi) {
      const paper = await getPaper(`DOI:${normalizeDoi(doi)}`);
      return NextResponse.json({ paper });
    }

    if (title) {
      const result = await searchPapers(title);
      const paper = result.data?.[0];
      if (!paper) {
        return NextResponse.json(
          { error: "タイトルから論文を解決できませんでした" },
          { status: 404 },
        );
      }
      return NextResponse.json({ paper });
    }

    const paper = await getPaper(s2Id!);
    return NextResponse.json({ paper });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}