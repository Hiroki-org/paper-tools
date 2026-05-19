🎯 **What:**
Added missing authentication to the `/api/resolve` POST endpoint.

⚠️ **Risk:**
The `/api/resolve` endpoint was bypassed by the `middleware.ts` but lacked manual authentication logic. This meant any unauthenticated user could query arbitrary DOIs, Titles, or Semantic Scholar IDs, potentially misusing the internal paper resolution functionality and exposing backend resources to abuse or DOS vectors.

🛡️ **Solution:**
- Imported and utilized `isAuthenticated(request.cookies)` from `@/lib/auth` to enforce access control at the very beginning of the route handler.
- Requests failing the check now immediately return a `401 Unauthorized` JSON response.
- Replaced the unsafe non-null assertion `s2Id!` with an explicit null-check and an early return to resolve technical debt and satisfy the Biome linter.
- Updated `route.test.ts` to fully cover the unauthenticated branch and corrected test typings.
