"use client";

import { useParams, useRouter } from "next/navigation";
import { PaperDetailView } from "@/components/paper/PaperDetailView";
import { PaperSkeleton } from "@/components/paper/PaperSkeleton";
import { usePaperDetail } from "@/components/paper/usePaperDetail";

export default function PaperDetailPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();
  const paperId = params?.paperId ? String(params.paperId) : null;
  const { paper, loading, error } = usePaperDetail(paperId);

  return (
    <div className="space-y-6">
      {loading && !paper && <PaperSkeleton />}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {paper && <PaperDetailView paper={paper} onBack={() => router.back()} />}
    </div>
  );
}
