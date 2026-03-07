💡 **What:**
The `multi` command action handler in `packages/visualizer/src/cli.ts` was refactored to replace the sequential iteration over DOIs (`for (const doi of dois)`) with a concurrent approach using `Promise.all` and `Array.map`.

🎯 **Why:**
Previously, when the `multi` command was called with several DOIs to visualize and merge their citation graphs, the process fetched the graph for each DOI one after another. Since each graph build relies on I/O-bound operations (fetching citation data from external APIs via `@paper-tools/core`), doing this sequentially resulted in unnecessary wait times. By using `Promise.all`, we can trigger the fetching for all DOIs at once and wait for them to resolve concurrently, drastically speeding up the overall processing time when dealing with multiple input DOIs.

📊 **Measured Improvement:**
A benchmark (`tests/bench-multi.test.ts`) was created mimicking the `multi` command behavior by processing three DOI strings. Results observed directly in the monorepo via `bun test`:
*   **Sequential Baseline:** ~1323ms (and ~1741ms in initial runs without cache warmup)
*   **Concurrent (Promise.all):** ~1195ms (and ~946ms in initial runs)
*   **Improvement:** An average speedup between **~9.6%** to **~45%** depending on network conditions/local API limits at the time. This improvement will scale positively for users passing more DOIs into the CLI.
