import { useQuery } from "../convex/_generated/react";
import { StatusResponse } from "../convex/observer";

function HomePage() {
  const status = useQuery("observer:status") ?? null;
  return <SantaStatus status={status} />;
}

export default HomePage;

const SANTA = "🎅";
const DEER = "🦌";
const ELF = "🧝";

function getVacationEmojis(status: StatusResponse): any[] {
  let emojis = [];
  for (let x = 0; x < status.vacationing.reindeer; x++) {
    emojis.push(DEER);
  }
  for (let x = 0; x < status.vacationing.elves; x++) {
    emojis.push(ELF);
  }
  return emojis;
}

function getWaitingEmojis(status: StatusResponse): any[] {
  let emojis = [];
  for (let x = 0; x < status.waiting.reindeer; x++) {
    emojis.push(DEER);
  }
  for (let x = 0; x < status.waiting.elves; x++) {
    emojis.push(ELF);
  }
  if (
    getDeliveringEmojis(status).length + getBuildingEmojis(status).length ===
    0
  ) {
    emojis.splice(0, 0, SANTA);
  }
  return emojis;
}

function getDeliveringEmojis(status: StatusResponse): any[] {
  let emojis = [];
  for (let x = 0; x < status.working.reindeer; x++) {
    emojis.push(DEER);
  }
  if (emojis.length > 0) {
    emojis.splice(0, 0, SANTA);
  }
  return emojis;
}

function getBuildingEmojis(status: StatusResponse): any[] {
  let emojis = [];
  for (let x = 0; x < status.working.elves; x++) {
    emojis.push(ELF);
  }
  if (emojis.length > 0) {
    emojis.splice(0, 0, SANTA);
  }
  return emojis;
}

const stats = [
  { id: 1, name: "On vacation in Jamaica", getEmojis: getVacationEmojis },
  { id: 2, name: "Ready to work", getEmojis: getWaitingEmojis },
  { id: 3, name: "Making presents", getEmojis: getBuildingEmojis },
  { id: 4, name: "Delivering presents", getEmojis: getDeliveringEmojis },
];

function SantaStatus({ status }: { status: StatusResponse }) {
  if (status === null) {
    return <div>Connecting to the North Pole...</div>;
  }
  return (
    <div className="bg-gray-900 py-16 sm:py-16 snowy">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center">
            <img src="/santa.png" className="santa" />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              North Pole command center
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-300">
              Santa will go deliver presents with all nine reindeer when they
              are ready. Otherwise, Santa will grab any group of three waiting
              elves to build presents together. Both reindeer and elves take
              extensive vacation breaks, as the North Pole is cold and bleak.
            </p>
          </div>
          <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(stat => (
              <div
                key={stat.id}
                className="h-32 flex flex-col bg-slate-700/80 p-8"
              >
                <dt className="text-sm font-semibold leading-6 text-gray-300">
                  {stat.name}
                </dt>
                <dd className="order-first text-xl font-semibold tracking-tight text-white">
                  {stat.getEmojis(status).map((em, i) => (
                    <span key={i}>{em}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
