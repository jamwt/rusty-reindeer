import { Doc, Id } from "./_generated/dataModel";
import {
  DatabaseReader,
  DatabaseWriter,
  mutation,
  query,
} from "./_generated/server";

export const insertReadyWorker = mutation(
  async (
    { db }: { db: DatabaseWriter },
    { workerType }: { workerType: "reindeer" | "elves" }
  ) => {
    const newId = await db.insert("workers", { workerType, state: "ready" });
    return newId;
  }
);

export const isTimeToWork = query(
  async ({ db }: { db: DatabaseReader }, { id }: { id: Id<"workers"> }) => {
    return (await db.get(id))!.state == "working";
  }
);

export const isTimeToVacation = query(
  async ({ db }: { db: DatabaseReader }, { id }: { id: Id<"workers"> }) => {
    return (await db.get(id))!.state == "vacationing";
  }
);

export const markBackFromVacation = mutation(
  async ({ db }: { db: DatabaseWriter }, { id }: { id: Id<"workers"> }) => {
    await db.patch(id, {
      state: "ready",
    });
  }
);
