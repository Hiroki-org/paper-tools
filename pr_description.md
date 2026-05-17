🎯 **What:** Replaced `console.log` with `process.stdout.write` in the `author-profiler` CLI `save` command, correctly formatting the JSON output and appending a newline. The relevant test was also updated to spy on `process.stdout.write` instead of `console.log`.

💡 **Why:** To address the "Console Log in CLI Command" code health issue. Using `process.stdout.write` avoids the automatic formatting applied by `console.log` while bypassing the need to introduce a new external UI logger or UI framework dependency just for printing the result.

✅ **Verification:** Ran the full test suite (`cd packages/author-profiler && pnpm test`) and ensured the updated test for `save` command passes and no other tests regressed.

✨ **Result:** A cleaner CLI codebase that adheres to code health conventions by not using `console.log`, without inflating the package dependency tree.
