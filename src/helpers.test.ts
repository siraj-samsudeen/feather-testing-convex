import { describe, expect } from "vitest";
import { createConvexTest } from "./index.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";
import { api } from "../convex/_generated/api.js";

const test = createConvexTest(schema, modules);

describe("createConvexTest fixtures", () => {
  test("client fixture is authenticated", async ({ client, userId }) => {
    expect(userId).toBeDefined();
    expect(typeof userId).toBe("string");
  });

  test("seed auto-fills userId", async ({ client, seed }) => {
    const todoId = await seed("todos", { text: "Test", completed: false });
    expect(todoId).toBeDefined();

    const todos = await client.query(api.todos.list, {});
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe("Test");
  });

  test("createUser returns new authenticated client", async ({ client, createUser }) => {
    await client.mutation(api.todos.create, { text: "Alice's" });

    const bob = await createUser();
    const bobTodos = await bob.query(api.todos.list, {});
    expect(bobTodos).toHaveLength(0);
  });

  test("testClient is unauthenticated", async ({ testClient }) => {
    const todos = await testClient.query(api.todos.list, {});
    expect(todos).toHaveLength(0);
  });
});
