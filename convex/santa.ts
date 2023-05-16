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
    throw "Busy workers before santa said to go?";
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
    throw "should never try to kick off a workgroup when work is already happening";
  }
  if (work == "reindeer") {
    const reindeer = await waitingReindeer({ db });
    assert(reindeer.length === 9);
    for (const r of reindeer) {
      await db.patch(r._id, { state: "working" });
    }
  } else if (work == "elves") {
    // Then, kick off elves to work.
    const elves = await waitingElves({ db });
    assert(elves.length >= 3);
    const wakeElves = elves.slice(0, 3);
    for (const e of wakeElves) {
      await db.patch(e._id, { state: "working" });
    }
  } else {
    throw "Uh, what kind of job is this?";
  }
});

export const releaseGroup = mutation(async ({ db }) => {
  const workers = await currentWorkers({ db });
  for (const w of workers) {
    await db.patch(w._id, {
      state: "vacationing",
    });
  }
});

export const reset = mutation(async ({ db }) => {
  const everyone = await db.query("workers").collect();
  for (const entity of everyone) {
    await db.delete(entity._id);
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
        q.eq(q.field("state"), "ready")
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
        q.eq(q.field("state"), "ready")
      )
    )
    .collect();
};

const currentWorkers = async ({
  db,
}: {
  db: DatabaseReader;
}): Promise<Doc<"workers">[]> => {
  const busyWorkers = await db
    .query("workers")
    .filter(q => q.eq(q.field("state"), "working"))
    .collect();
  return busyWorkers;
};

const anyoneWorking = async ({
  db,
}: {
  db: DatabaseReader;
}): Promise<boolean> => {
  return (await currentWorkers({ db })).length > 0;
};
