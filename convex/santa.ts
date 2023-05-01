import { Doc } from "./_generated/dataModel";
import {
  DatabaseReader,
  DatabaseWriter,
  mutation,
  query,
} from "./_generated/server";

function assert(cond: boolean) {
  if (!cond) {
    throw `Assertion failed`;
  }
}
export const newGroupReady = query(async ({ db }): Promise<string | null> => {
  // Don't start a new work group if one is still going.
  const workersBusy = await anyoneWorking({ db });
  if (workersBusy) {
    return null;
  }
  // No one working? Do we have another workgroup?
  const reindeer = await waitingReindeer({ db });
  if (reindeer.length == 9) {
    return "reindeer";
  }
  const elves = await waitingElves({ db });
  if (elves.length >= 3) {
    return "elves";
  }
  return null;
});

export const dispatchGroup = mutation(async ({ db }, { work }) => {
  if (await anyoneWorking({ db })) {
    return;
  }
  if (work == "reindeer") {
    const reindeer = await waitingReindeer({ db });
    assert(reindeer.length === 9);
    for (const r of reindeer) {
      await db.patch(r._id, { working: true });
    }
  } else if (work == "elves") {
    // Then, kick off elves to work.
    const elves = await waitingElves({ db });
    assert(elves.length >= 3);
    const wakeElves = elves.slice(0, 3);
    for (const e of wakeElves) {
      await db.patch(e._id, { working: true });
    }
  } else {
    throw "Uh, what kind of job is this?";
  }
});

const waitingReindeer = async ({
  db,
}: {
  db: DatabaseReader;
}): Promise<Doc<"workers">[]> => {
  return await db
    .query("workers")
    .filter(q =>
      q.and(
        q.eq(q.field("workerType"), "reindeer"),
        q.eq(q.field("working"), false)
      )
    )
    .collect();
};

const waitingElves = async ({
  db,
}: {
  db: DatabaseReader;
}): Promise<Doc<"workers">[]> => {
  return await db
    .query("workers")
    .filter(q =>
      q.and(
        q.eq(q.field("workerType"), "elves"),
        q.eq(q.field("working"), false)
      )
    )
    .collect();
};

const anyoneWorking = async ({
  db,
}: {
  db: DatabaseReader;
}): Promise<boolean> => {
  const busyWorker = await db
    .query("workers")
    .filter(q => q.field("working"))
    .first();
  return busyWorker != null;
};
