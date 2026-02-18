import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({}),
  items: defineTable({
    text: v.string(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id("users"),
  }),
});
