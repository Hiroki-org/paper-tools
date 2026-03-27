"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AuthorProfile } from "@paper-tools/core";
import MetricCards from "@/components/author/MetricCards";
import CoauthorNetworkGraph from "@/components/author/CoauthorNetworkGraph";
import TopicTimelineChart from "@/components/author/TopicTimelineChart";

export default function AuthorDetailPage() {
  const params = useParams<{ authorId: string }>();
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const resolvedAuthorId = params.authorId;
      if (!resolvedAuthorId) {
        if (!cancelled) {
          setError("authorId is required");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/authors/${encodeURIComponent(resolvedAuthorId)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load author profile");
        }
        if (cancelled) return;
        setProfile(data as AuthorProfile);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.authorId]);

  if (loading) {
    return (
      <div className="text-sm text-[var(--color-text-muted)]">
        Loading author profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error ?? "Author profile not found"}
        </div>
        <Link
          href="/authors"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Author Profile
          </p>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {profile.affiliations.map((a) => a.name).join(", ") ||
              "No affiliations"}
          </p>
        </div>
        <div className="flex gap-2">
          {profile.homepage && (profile.homepage.startsWith("http://") || profile.homepage.startsWith("https://")) && (
            <a
              href={profile.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Homepage ↗
            </a>
          )}
          <a
            href={`https://www.semanticscholar.org/author/${encodeURIComponent(profile.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Semantic Scholar ↗
          </a>
        </div>
      </div>

      <MetricCards profile={profile} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top Papers</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-slate-50 text-left">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Citations</th>
                <th className="px-4 py-3">Venue</th>
              </tr>
            </thead>
            <tbody>
              {profile.topPapers.map((paper, index) => (
                <tr
                  key={`${paper.title}-${index}`}
                  className="border-b border-[var(--color-border)]"
                >
                  <td className="px-4 py-3 font-medium">{paper.title}</td>
                  <td className="px-4 py-3">{paper.year ?? "-"}</td>
                  <td className="px-4 py-3">{paper.citationCount ?? 0}</td>
                  <td className="px-4 py-3">{paper.venue ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coauthor Network</h2>
        <CoauthorNetworkGraph
          authorId={profile.id}
          authorName={profile.name}
          coauthors={profile.coauthors}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Topic Timeline</h2>
        <TopicTimelineChart timeline={profile.topicTimeline} />
      </section>
    </div>
  );
}
