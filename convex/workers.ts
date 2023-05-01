import { Id } from "./_generated/dataModel";
import {
  DatabaseReader,
  DatabaseWriter,
  mutation,
  query,
} from "./_generated/server";

export const insertReadyWorker = mutation(
  async (
    { db }: { db: DatabaseWriter },
    { workerType }: { workerType: string }
  ) => {
    const newId = await db.insert("workers", { workerType, working: false });
    return newId;
  }
);

export const timeToWork = query(
  async ({ db }: { db: DatabaseReader }, { id }: { id: Id<"workers"> }) => {
    return (await db.get(id))!.working;
  }
);

export const workDone = mutation(
  async ({ db }: { db: DatabaseWriter }, { id }: { id: Id<"workers"> }) => {
    await db.delete(id);
  }
);
