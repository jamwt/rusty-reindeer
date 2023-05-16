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
        elves: 0,
        reindeer: 0,
      },
    };
    for (const worker of all) {
      if (worker.workerType == "elves") {
        switch (worker.state) {
          case "ready": {
            response.waiting.elves += 1;
            break;
          }
          case "vacationing": {
            response.vacationing.elves += 1;
            break;
          }
          case "working": {
            response.working.elves += 1;
            break;
          }
        }
      } else if (worker.workerType == "reindeer") {
        switch (worker.state) {
          case "ready": {
            response.waiting.reindeer += 1;
            break;
          }
          case "vacationing": {
            response.vacationing.reindeer += 1;
            break;
          }
          case "working": {
            response.working.reindeer += 1;
            break;
          }
        }
      } else {
        throw "whaaat is this unknown worker thingie??";
      }
    }
    return response;
  }
);
