# Plan: TanStack React Query Support

## Implementation Steps

1. Install dev dependencies: `@tanstack/react-query`, `@convex-dev/react-query`
2. Add `action` method to `ConvexTestProvider`'s fakeClient (backward-compatible fix)
3. Create `src/tanstack-query.tsx` with all new exports
4. Update `package.json` (sub-path export, optional peer deps)
5. Create `src/tanstack-query.test.tsx` with comprehensive tests
6. Build and verify
7. Update consumer app (`feather-starter-convex`)

## Detailed plan in approved proposal

See the approved plan proposal for full implementation details including:
- Architecture diagram
- Query invalidation flow
- All code patterns
- File change matrix
- Design decisions
