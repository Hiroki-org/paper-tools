import { NextRequest, NextResponse } from "next/server";
import {
  recommendFromSingle,
  recommendFromMultiple,
  resolveToS2Id,
} from "@paper-tools/recommender";

interface SingleBody {
  paperId: string;
  limit?: number;
  from?: "recent" | "all-cs";
}

interface MultiBody {
  positiveIds: string[];
  negativeIds?: string[];
  limit?: number;
}

type RecommendBody = SingleBody | MultiBody;

function isMultiBody(body: RecommendBody): body is MultiBody {
  return "positiveIds" in body;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendBody;

    if (isMultiBody(body)) {
      const { positiveIds, negativeIds = [], limit } = body;

      if (!positiveIds || positiveIds.length === 0) {
        return NextResponse.json(
          { error: "positiveIds array is required and must not be empty" },
          { status: 400 },
        );
      }

      const resolvedPos = await Promise.all(positiveIds.map(resolveToS2Id));
      const resolvedNeg = await Promise.all(negativeIds.map(resolveToS2Id));
      const papers = await recommendFromMultiple(resolvedPos, resolvedNeg, { limit });
      return NextResponse.json({ papers, total: papers.length });
    } else {
      const { paperId, limit, from } = body;

      if (!paperId) {
        return NextResponse.json(
          { error: "paperId is required" },
          { status: 400 },
        );
      }

      const resolvedId = await resolveToS2Id(paperId);
      const papers = await recommendFromSingle(resolvedId, { limit, from });
      return NextResponse.json({ papers, total: papers.length });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
