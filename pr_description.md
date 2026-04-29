🎯 **What:** The testing gap addressed
The functions `getStatusCodeFromError`, `isNotionDataSource`, and `getFirstDataSourceIdFromDatabase` in `notion-data-source.ts` lacked test coverage for specific null returns and edge cases, such as missing regex match array values or invalid data types from the fallback retrieving logic.

📊 **Coverage:** What scenarios are now tested
1. Added a test confirming `getStatusCodeFromError` correctly returns `null` when a matching string is present but standard JS `Number(match[1])` parsing combined with `Number.isInteger` check evaluates to false (e.g. fractional matching strings that the regex doesn't capture well, or specifically "000" testing the fallback zero).
2. Added test checking if `resolveNotionDataSource` correctly falls back if `client.dataSources.retrieve` returns a non-object (testing `isNotionDataSource` returning false for null primitives).
3. Added a test to `resolveNotionDataSource` that throws an error if `client.databases.retrieve` returns a database object that correctly maps to a `null` initial data_source array element.
4. Added test catching non-object primitive returns for fallback databases.

✨ **Result:** The improvement in test coverage
Test coverage on `src/lib/notion-data-source.ts` increased from `90.32%` statement coverage up to **100% statement and branch coverage**. All previously unreached lines (28, 33-34, 45-46, 55-56) are now fully validated by tests during the test suite run.
