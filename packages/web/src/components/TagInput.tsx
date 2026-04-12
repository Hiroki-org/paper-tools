"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

type SuggestResponse = {
  suggestions?: string[];
};

function normalizeTag(tag: string) {
  return tag.trim();
}

export default function TagInput({
  value,
  onChange,
  placeholder = "タグを入力（Enterで追加）",
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, string[]>());

  const normalizedValueSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const addTag = useCallback(
    (raw: string) => {
      const normalized = normalizeTag(raw);
      if (!normalized) return;
      if (normalizedValueSet.has(normalized.toLowerCase())) {
        setQuery("");
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
      onChange([...value, normalized]);
      setQuery("");
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange, value, normalizedValueSet],
  );

  const removeTag = useCallback(
    (target: string) => {
      onChange(value.filter((item) => item !== target));
    },
    [onChange, value],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      setSuggestError(null);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    const cachedKeys = Array.from(cacheRef.current.keys()).sort(
      (a, b) => b.length - a.length,
    );
    const matchedKey = cachedKeys.find((key) => cacheKey.startsWith(key));
    const cached = matchedKey ? cacheRef.current.get(matchedKey) : undefined;
    if (cached) {
      setSuggestions(
        cached
          .filter((item) => item.toLowerCase().includes(cacheKey))
          .filter((item) => !normalizedValueSet.has(item.toLowerCase())),
      );
      setOpen(true);
      setActiveIndex(-1);
      setSuggestError(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags/suggest?q=${encodeURIComponent(trimmed)}&limit=10`);
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          setSuggestError("候補の取得に失敗しました");
          return;
        }
        const data = (await res.json()) as SuggestResponse;
        const next = (data.suggestions ?? []).filter(
          (item) => !normalizedValueSet.has(item.toLowerCase()),
        );
        cacheRef.current.set(cacheKey, data.suggestions ?? []);
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(-1);
        setSuggestError(null);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to fetch tag suggestions:", error);
        }
        setSuggestions([]);
        setOpen(false);
        setSuggestError("候補の取得に失敗しました");
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query, normalizedValueSet]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`${tag} を削除`}
              className="text-slate-400 hover:text-slate-700"
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(suggestions.length > 0)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open || suggestions.length === 0) return;
              setActiveIndex((prev) => (prev + 1) % suggestions.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open || suggestions.length === 0) return;
              setActiveIndex((prev) =>
                prev <= 0 ? suggestions.length - 1 : prev - 1,
              );
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && activeIndex >= 0 && suggestions[activeIndex]) {
                addTag(suggestions[activeIndex]);
                return;
              }
              addTag(query);
            }
          }}
        />

        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {suggestions.map((item, index) => (
              <li key={item}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestError && (
        <p className="text-xs text-amber-700">{suggestError}</p>
      )}
    </div>
  );
}
