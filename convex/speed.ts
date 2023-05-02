import { mutation, query } from "./_generated/server";

export const getSpeeds = query(async ({ db }) => {
  return await db.query("speeds").first();
});

export const setSpeeds = mutation(
  async (
    { db },
    { vacationSpeed, workSpeed }: { vacationSpeed: number; workSpeed: number }
  ) => {
    const existing = await db.query("speeds").first();
    if (existing != null) {
      await db.patch(existing._id, { vacationSpeed, workSpeed });
    } else {
      await db.insert("speeds", { vacationSpeed, workSpeed });
    }
  }
);
