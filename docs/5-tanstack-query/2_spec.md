# Spec: TanStack React Query Support

## Requirements

### Must Have

1. **`ConvexTestQueryProvider`** — React component wrapping `QueryClientProvider` + `ConvexProvider` with:
   - Custom `queryFn` that routes `convexQuery()` keys to the test client
   - Auto query invalidation after mutations/actions (UI updates after mutations)
   - Support for `authenticated` prop (mirrors `ConvexTestProvider`)

2. **`ConvexTestQueryAuthProvider`** — Auth-aware version with `signIn`/`signOut` and `ConvexAuthActionsContext`

3. **`renderWithConvexQuery(ui, client)`** — RTL render helper

4. **`renderWithConvexQueryAuth(ui, client, options?)`** — Auth-aware RTL render helper

5. **`createTestQueryFn(client)`** — Exported for advanced users who want custom QueryClient setup

6. **`createTestQueryClient(client)`** — Exported for advanced users

7. **Sub-path export: `feather-testing-convex/tanstack-query`** — Keeps dependencies optional

8. **`@tanstack/react-query` and `@convex-dev/react-query` as optional peer dependencies**

### Must Not

1. Break existing API (`ConvexTestProvider`, `renderWithConvex`, `renderWithConvexAuth`, `createConvexTest`)
2. Make `@tanstack/react-query` a required dependency

### Nice to Have

1. Support for `useSuspenseQuery` (should work automatically with same `queryFn`)
2. Graceful handling of non-Convex query keys (don't throw)

## Constraints

- One-shot behavior for initial query is acceptable (same as production's initial fetch via `queryFn`)
- Query invalidation after mutations provides the reactivity that production gets via WebSocket subscriptions
- The `createConvexTest` fixtures (`client`, `testClient`, `seed`, etc.) work with both old and new render functions
