# Test Strategy

## Decision Guide

| What you're testing | Approach | Why |
|---------------------|----------|-----|
| Query returns correct data | Integration (`renderWithConvex`) | Tests real function + React together |
| Component shows loading spinner | Mock (`vi.mock("convex/react")`) | Loading is transient, can't reliably produce with real backend |
| Component shows empty state | Integration | Real query returns `[]` |
| Component shows error state | Mock | Can't reliably produce errors from real backend |
| Data ordering/filtering | Integration | Seed data, verify render order |
| Business rules / calculations | Backend (`convex-test` directly) | Only if complex enough to warrant isolation |
| Auth rules (who can see what) | Integration with multi-user | `createUser()` + access control assertions |

**Rule of thumb:** Integration tests by default. Mocks only for states you can't reliably produce.

## MECE Test Design

Tests should be **Mutually Exclusive, Collectively Exhaustive** — no overlapping coverage, no gaps.

### Example: TodoList Component

```tsx
function TodoList() {
  const todos = useQuery(api.todos.list);
  if (todos === undefined) return <div>Loading...</div>;      // State 1
  if (todos.length === 0) return <div>No todos yet</div>;     // State 2
  return <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>;  // State 3
}
```

| Test | State | Approach |
|------|-------|----------|
| Loading | `undefined` | Mock |
| Empty | `[]` | Integration |
| With data + ordering | `[...items]` | Integration |

**3 tests = 100% coverage, no redundancy.**

### Anti-pattern: Overlapping Tests

```typescript
// BAD: These tests overlap — both test the empty case
it("returns empty array", ...)           // Backend test
it("shows empty state", ...)             // Integration test — ALSO tests empty array return!
```

Pick one layer. Integration tests give coverage on both UI and backend simultaneously.

## Integration Tests (Primary)

Real Convex functions + React rendering. This is the default choice.

```tsx
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

## Unit/Mock Tests (Transient States Only)

Only for loading spinners, error states, or other states that are impossible to reliably produce with the real backend.

```tsx
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));
import { useQuery } from "convex/react";

it("shows loading state", () => {
  vi.mocked(useQuery).mockReturnValue(undefined);
  render(<TodoList />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});
```

## Backend-Only Tests (Complex Logic)

Only for complex business logic that's easier to test in isolation. Simple CRUD functions are already covered by integration tests.

```typescript
import { convexTest } from "convex-test";

it("returns todos in descending order", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => { await ctx.db.insert("todos", { text: "First", completed: false }); });
  await t.run(async (ctx) => { await ctx.db.insert("todos", { text: "Second", completed: false }); });

  const todos = await t.query(api.todos.list);
  expect(todos[0].text).toBe("Second");
});
```

## Common Mistakes

- **Writing backend tests for simple CRUD** — Integration tests already cover them. Run coverage to verify.
- **Testing loading states with integration tests** — Loading is transient; use mocks.
- **Duplicate coverage across layers** — If an integration test covers a query, don't also write a backend test for the same query.
