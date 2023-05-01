import { defineSchema, defineTable } from "convex/schema";
import { v } from "convex/values";

export default defineSchema({
  workers: defineTable({ workerType: v.string(), working: v.boolean() }),
});
