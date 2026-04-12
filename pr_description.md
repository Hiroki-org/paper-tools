title: 🧹 Fix DOI parameter resolution in graph builder

🎯 **What:** Modified the `resolveToDoi` function in `packages/web/src/app/graph/page.tsx` to properly clean and format DOI inputs.

💡 **Why:** By addressing a FIXME comment, this prevents the system from failing to look up citations for correctly typed DOIs that might just contain URL or scheme prefixes like `https://doi.org/` or `doi:`.

✅ **Verification:** Verified by ensuring the change strictly returns the normalized DOI and that `pnpm -F @paper-tools/web test` successfully passes the full workspace suite.

✨ **Result:** Better user experience for those pasting complete DOI links and removal of a long standing placeholder behaviour.
