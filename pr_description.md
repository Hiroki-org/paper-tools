🧪 Test AuthorResolver error handling

🎯 **What:** Added tests for API failures from `getAuthor` and `searchAuthors` in `resolveAuthorId`.
📊 **Coverage:** Covered API failure scenarios, increasing line coverage to 100% for `author-resolver.ts`.
✨ **Result:** Improved test coverage and reliability for `resolveAuthorId`.

---

🔧 **CI Fix:** Synchronized `@vitest/coverage-v8` version across all workspace packages from `3.2.4` to `4.1.0` to match the `vitest` dependency version (`4.1.0`). This resolves the "Running mixed versions is not supported" failure in the GitHub Actions CI suite during `pnpm test --coverage`.
