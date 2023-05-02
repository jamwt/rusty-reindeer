import { DatabaseReader, query } from "./_generated/server";

const NUM_ELVES = 10;
const NUM_REINDEER = 9;

export type StatusGroup = {
  elves: number;
  reindeer: number;
};

export type StatusResponse = {
  waiting: StatusGroup;
  working: StatusGroup;
  vacationing: StatusGroup;
};

export const status = query(
  async ({ db }: { db: DatabaseReader }): Promise<StatusResponse> => {
    const all = await db.query("workers").collect();
    let response: StatusResponse = {
      waiting: {
        elves: 0,
        reindeer: 0,
      },
      working: {
        elves: 0,
        reindeer: 0,
      },
      vacationing: {
        elves: NUM_ELVES,
        reindeer: NUM_REINDEER,
      },
    };
    for (const worker of all) {
      if (worker.workerType == "elves") {
        response.vacationing.elves -= 1;
        if (worker.working) {
          response.working.elves += 1;
        } else {
          response.waiting.elves += 1;
        }
      } else if (worker.workerType == "reindeer") {
        response.vacationing.reindeer -= 1;
        if (worker.working) {
          response.working.reindeer += 1;
        } else {
          response.waiting.reindeer += 1;
        }
      } else {
        throw "whaaat is this unknown worker thingie??";
      }
    }
    return response;
  }
);
