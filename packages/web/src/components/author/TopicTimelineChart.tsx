import type { TopicTimelineEntry } from "@paper-tools/core";

interface TopicTimelineChartProps {
  timeline: TopicTimelineEntry[];
}

export default function TopicTimelineChart({
  timeline,
}: TopicTimelineChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-text-muted)]">
        トピック遷移データがありません。
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {timeline.map((entry) => (
        <div key={entry.year} className="space-y-2">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {entry.year}
          </div>
          <div className="space-y-1.5">
            {entry.topics.slice(0, 5).map((topic) => (
              <div
                key={`${entry.year}-${topic.name}`}
                className="grid grid-cols-[120px_1fr_48px] items-center gap-2"
              >
                <span
                  className="truncate text-xs text-[var(--color-text-muted)]"
                  title={topic.name}
                >
                  {topic.name}
                </span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[var(--color-primary)]"
                    style={{
                      width: `${Math.max(4, Math.min(100, topic.score * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-right text-xs text-[var(--color-text-muted)]">
                  {(topic.score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
