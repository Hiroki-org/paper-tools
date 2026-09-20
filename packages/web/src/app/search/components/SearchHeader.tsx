import SearchForm from "@/components/SearchForm";

interface SearchHeaderProps {
  onSearch: (query: string, maxResults: number) => Promise<void>;
  loading: boolean;
}

export default function SearchHeader({ onSearch, loading }: SearchHeaderProps) {
  return (
    <section className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Literature search
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Search Papers
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
          キーワードから論文を探し、検索結果を起点に引用探索や推薦にそのまま繋げられます。
          必要に応じてドリルダウンを使い、関連トピックを段階的に広げていけます。
        </p>
      </div>

      <div className="mt-6">
        <SearchForm onSearch={onSearch} loading={loading} />
      </div>
    </section>
  );
}
