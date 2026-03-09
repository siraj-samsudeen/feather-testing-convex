# Research: TanStack React Query Support

## Problem Statement

Components using `@tanstack/react-query` + `@convex-dev/react-query` bridge don't receive data when tested with `ConvexTestProvider`. This is because:

1. `convexQuery(api.app.getCurrentUser, {})` generates `{ queryKey: ["convexQuery", "app:getCurrentUser", {}], staleTime: Infinity }` — **no queryFn**
2. In production, `ConvexQueryClient.queryFn()` is set as the global default `queryFn` on the `QueryClient`
3. In tests, there is no `ConvexQueryClient` or `QueryClient`, so TanStack Query's `useQuery` has no way to fetch data

## How @convex-dev/react-query Works

### `convexQuery()` — Options Factory

```typescript
export function convexQuery(funcRef, ...argsOrSkip) {
  return {
    queryKey: ["convexQuery", getFunctionName(funcRef), args],  // string name!
    staleTime: Infinity,
    // NO queryFn — relies on global default
  };
}
```

Key: `getFunctionName(funcRef)` converts the function reference to a string (e.g., `"app:getCurrentUser"`).

### `ConvexQueryClient` — The Production Bridge

- Takes a `ConvexReactClient` and a `QueryClient`
- Sets up a global `queryFn` that routes `["convexQuery", ...]` keys to `convexClient.query()`
- Also subscribes to QueryCache events to create WebSocket subscriptions for real-time updates
- Uses `.watchQuery()`, `.query()`, `.action()`, `.url` on `ConvexReactClient`

### `useConvexMutation` / `useConvexAction`

These are re-exports of `useMutation` / `useAction` from `convex/react`. They go through `ConvexProvider` → `ConvexReactClient` (or our fakeClient) → `.mutation()` / `.action()`.

## Key Insight: `makeFunctionReference`

`convex/server` exports `makeFunctionReference(name)` which creates `{ [functionName]: name }` — a valid `FunctionReference` from a string name. Since `convexQuery()` stores string names in the queryKey, we can reconstruct function references:

```typescript
const [_, funcName, args] = queryKey;  // ["convexQuery", "app:getCurrentUser", {}]
const funcRef = makeFunctionReference("app:getCurrentUser");
const result = await testClient.query(funcRef, args);
```

## Design Decision: Skip ConvexQueryClient

We don't use `ConvexQueryClient` in tests because:
1. It expects a real `ConvexReactClient` (WebSocket, connection state, etc.)
2. It sets up real-time subscriptions which aren't needed for one-shot tests
3. A simple custom `queryFn` with `makeFunctionReference` is sufficient

## Query Invalidation After Mutations

Production Convex pushes new query results after mutations via WebSocket subscriptions. In tests:
- The existing `ConvexTestProvider` is one-shot — queries don't update after mutations
- For the TanStack Query version, we can auto-invalidate queries by wrapping fakeClient's `mutation()` / `action()` to call `queryClient.invalidateQueries({ queryKey: ["convexQuery"] })` after resolving
- This causes TanStack Query to refetch all Convex queries via our custom `queryFn`
- **Result: UI updates after mutations in tests!**
