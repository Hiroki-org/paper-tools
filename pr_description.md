🎯 **What:**
Added a comprehensive test suite for the `/api/archive` API route in the `packages/web` workspace (`packages/web/src/app/api/archive/route.test.ts`).

📊 **Coverage:**
The tests cover both the `GET` and `POST` endpoints of the `route.ts` API. Covered scenarios include:
*   Unauthenticated requests returning 401.
*   Missing selected database ID returning 400.
*   The `GET` endpoint mapping page records correctly, returning total counts, database info, and handling Notion API error/success responses.
*   The `POST` endpoint creating a page in Notion successfully with correct mapped properties, handling various DOI property types (url vs rich_text), and verifying 400 response when the paper is missing from the request body.
*   Exception handling scenarios mapping to 500 status codes.

✨ **Result:**
The test suite successfully increased test coverage for `packages/web/src/app/api/archive/route.ts` to 100% statement and lines coverage, eliminating a testing gap in the repository and providing a safety net for future refactoring. All workspace packages build and pass tests without regressions.
