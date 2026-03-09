/**
 * Tests for TanStack React Query integration.
 *
 * Validates that components using @tanstack/react-query with @convex-dev/react-query
 * receive real data from the convex-test in-memory backend, and that mutations
 * trigger automatic query invalidation so the UI updates.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation as useConvexReactMutation } from "convex/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "../convex/test.setup";
import {
  ConvexTestQueryProvider,
  renderWithConvexQuery,
  renderWithConvexQueryAuth,
} from "./tanstack-query";

// ---------------------------------------------------------------------------
// Test components using TanStack Query patterns
// ---------------------------------------------------------------------------

/** Component using useQuery(convexQuery(...)) — the TanStack Query pattern */
function ItemList() {
  const { data: items, isLoading } = useQuery(convexQuery(api.items.list, {}));
  if (isLoading || !items) return <div>Loading</div>;
  if (items.length === 0) return <div>No items yet</div>;
  return (
    <ul>
      {items.map((item: any) => (
        <li key={item._id}>{item.text}</li>
      ))}
    </ul>
  );
}

/** Component with two different convexQuery calls */
function TwoQueries() {
  const { data: items } = useQuery(convexQuery(api.items.list, {}));
  const { data: todos } = useQuery(convexQuery(api.todos.list, {}));
  if (!items || !todos) return <div>Loading</div>;
  return (
    <div>
      <div>items:{items.length}</div>
      <div>todos:{todos.length}</div>
    </div>
  );
}

/** Component using useConvexMutation (convex/react's useMutation, re-exported) */
function AddItemButton() {
  const add = useConvexMutation(api.items.add);
  return (
    <button type="button" onClick={() => add({ text: "From test" })}>
      Add
    </button>
  );
}

/**
 * Component with list + add button to test query invalidation.
 * Uses TanStack Query's useQuery for reading + convex/react's useMutation for writing.
 */
function ItemListWithAdd() {
  const { data: items } = useQuery(convexQuery(api.items.list, {}));
  const add = useConvexReactMutation(api.items.add);
  if (!items) return <div>Loading</div>;
  return (
    <div>
      <div>{items.length === 0 ? "No items yet" : `${items.length} item(s)`}</div>
      <ul>
        {items.map((item: any) => (
          <li key={item._id}>{item.text}</li>
        ))}
      </ul>
      <button type="button" onClick={() => add({ text: "New item" })}>
        Add
      </button>
    </div>
  );
}

/** Component using TanStack Query's useMutation wrapping useConvexMutation */
function ItemListWithTanStackMutation() {
  const { data: items } = useQuery(convexQuery(api.items.list, {}));
  const mutationFn = useConvexMutation(api.items.add);
  const { mutate: add } = useMutation({ mutationFn });
  if (!items) return <div>Loading</div>;
  return (
    <div>
      <div>{items.length === 0 ? "No items yet" : `${items.length} item(s)`}</div>
      <button type="button" onClick={() => add({ text: "TanStack mutation" })}>
        Add via TanStack
      </button>
    </div>
  );
}

/** Component that uses auth-scoped query */
function AuthTodoList() {
  const { data: todos } = useQuery(convexQuery(api.todos.list, {}));
  if (!todos) return <div>Loading</div>;
  if (todos.length === 0) return <div>No todos</div>;
  return (
    <ul>
      {todos.map((todo: any) => (
        <li key={todo._id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConvexTestQueryProvider", () => {
  it("useQuery(convexQuery(...)) receives data from test backend", async () => {
    const client = convexTest(schema, modules);

    render(
      <ConvexTestQueryProvider client={client}>
        <ItemList />
      </ConvexTestQueryProvider>,
    );

    expect(await screen.findByText("No items yet")).toBeInTheDocument();
  });

  it("useQuery(convexQuery(...)) shows seeded data", async () => {
    const client = convexTest(schema, modules);
    await client.mutation(api.items.add, { text: "Alpha" });
    await client.mutation(api.items.add, { text: "Beta" });

    render(
      <ConvexTestQueryProvider client={client}>
        <ItemList />
      </ConvexTestQueryProvider>,
    );

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("multiple convexQuery calls resolve independently", async () => {
    const client = convexTest(schema, modules);

    const userId = await client.run(async (ctx) => {
      const newUserId = await ctx.db.insert("users", {});
      await ctx.db.insert("items", { text: "Item 1" });
      await ctx.db.insert("items", { text: "Item 2" });
      await ctx.db.insert("todos", {
        text: "Todo 1",
        completed: false,
        userId: newUserId,
      });
      return newUserId;
    });

    const authedClient = client.withIdentity({ subject: userId });

    render(
      <ConvexTestQueryProvider client={authedClient}>
        <TwoQueries />
      </ConvexTestQueryProvider>,
    );

    expect(await screen.findByText("items:2")).toBeInTheDocument();
    expect(screen.getByText("todos:1")).toBeInTheDocument();
  });

  it("useConvexMutation updates the backend", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();

    render(
      <ConvexTestQueryProvider client={client}>
        <AddItemButton />
      </ConvexTestQueryProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(async () => {
      const items = await client.query(api.items.list, {});
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe("From test");
    });
  });

  it("auto-invalidates queries after mutation — UI updates", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();

    render(
      <ConvexTestQueryProvider client={client}>
        <ItemListWithAdd />
      </ConvexTestQueryProvider>,
    );

    // Initially no items
    expect(await screen.findByText("No items yet")).toBeInTheDocument();

    // Click add — mutation fires, then query invalidation triggers refetch
    await user.click(screen.getByRole("button", { name: "Add" }));

    // UI should update because queries are auto-invalidated after mutation
    expect(await screen.findByText("1 item(s)")).toBeInTheDocument();
    expect(screen.getByText("New item")).toBeInTheDocument();
  });

  it("auto-invalidates after mutation wrapped in TanStack useMutation", async () => {
    const client = convexTest(schema, modules);
    const user = userEvent.setup();

    render(
      <ConvexTestQueryProvider client={client}>
        <ItemListWithTanStackMutation />
      </ConvexTestQueryProvider>,
    );

    expect(await screen.findByText("No items yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add via TanStack" }));

    // The mutation goes through ConvexProvider → fakeClient.mutation → invalidate
    expect(await screen.findByText("1 item(s)")).toBeInTheDocument();
  });
});

describe("renderWithConvexQuery", () => {
  it("works as a render helper", async () => {
    const client = convexTest(schema, modules);
    await client.mutation(api.items.add, { text: "Helper test" });

    renderWithConvexQuery(<ItemList />, client);

    expect(await screen.findByText("Helper test")).toBeInTheDocument();
  });
});

describe("renderWithConvexQueryAuth", () => {
  it("authenticated queries receive user-scoped data", async () => {
    const client = convexTest(schema, modules);

    const userId = await client.run(async (ctx) => {
      const id = await ctx.db.insert("users", {});
      await ctx.db.insert("todos", {
        text: "My todo",
        completed: false,
        userId: id,
      });
      return id;
    });

    const authedClient = client.withIdentity({ subject: userId });

    renderWithConvexQueryAuth(<AuthTodoList />, authedClient);

    expect(await screen.findByText("My todo")).toBeInTheDocument();
  });

  it("unauthenticated query returns empty for auth-required queries", async () => {
    const client = convexTest(schema, modules);

    // todos.list returns [] when no identity
    renderWithConvexQuery(<AuthTodoList />, client);

    expect(await screen.findByText("No todos")).toBeInTheDocument();
  });
});
