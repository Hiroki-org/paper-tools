import type { AuthorProfile } from "@paper-tools/core";

interface MetricCardsProps {
  profile: AuthorProfile;
}

const items = [
  { key: "hIndex", label: "h-index" },
  { key: "citationCount", label: "Citation Count" },
  { key: "paperCount", label: "Paper Count" },
  { key: "influentialCitationCount", label: "Influential Citations" },
] as const;

export default function MetricCards({ profile }: MetricCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
            {profile[item.key].toLocaleString()}
          </p>
        </div>
      ))}
    </section>
  );
}
