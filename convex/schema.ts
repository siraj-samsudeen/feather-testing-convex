import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    text: v.string(),
  }),
  users: defineTable({}),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id("users"),
  }),
});
