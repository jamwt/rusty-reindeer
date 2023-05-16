import { defineSchema, defineTable } from "convex/schema";
import { v } from "convex/values";

export default defineSchema({
  workers: defineTable({
    workerType: v.string(),
    state: v.union(
      v.literal("ready"),
      v.literal("working"),
      v.literal("vacationing")
    ),
  }),
  speeds: defineTable({ vacationSpeed: v.number(), workSpeed: v.number() }),
});
