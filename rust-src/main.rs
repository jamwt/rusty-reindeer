use std::{
    sync::{atomic::AtomicU64, Arc},
    time::Duration,
};

use convex::{ConvexClient, FunctionResult, Value};
use futures::StreamExt;
use rand::{Rng, SeedableRng};

use clap::Parser;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Convex deployment URL
    deployment_url: String,

    /// Turn debugging logging on
    #[arg(short, long, action = clap::ArgAction::Count)]
    debug: u8,

    /// Clear all state and quit.
    #[arg(long)]
    reset: bool,

    /// No santa
    #[arg(short, long)]
    no_santa: bool,

    /// Number of reindeer
    #[arg(short, long, default_value_t = 9)]
    reindeer: u8,

    /// Number of elves
    #[arg(short, long, default_value_t = 10)]
    elves: u8,
}

enum WorkerType {
    Reindeer,
    Elf,
}

impl From<&str> for WorkerType {
    fn from(value: &str) -> Self {
        match value {
            "elves" => WorkerType::Elf,
            "reindeer" => WorkerType::Reindeer,
            _ => panic!("santa, you okay?"),
        }
    }
}

impl WorkerType {
    fn describe_work(&self, id: &str) {
        match self {
            WorkerType::Elf => {
                println!("Elf {} meeting in the study", id);
            }
            WorkerType::Reindeer => {
                println!("Reindeer {} delivering toys", id);
            }
        }
    }
    fn santa_command(&self) -> &str {
        match self {
            WorkerType::Reindeer => "let's deliver toys",
            WorkerType::Elf => "let's meet in my study",
        }
    }
    fn table_name(&self) -> &str {
        match self {
            WorkerType::Elf => "elves",
            WorkerType::Reindeer => "reindeer",
        }
    }
}

const MAX_MILLISECONDS: f64 = 10_000.0;

fn percentile_to_ms_delay(percent: u8) -> u64 {
    let percent = u8::max(percent, 1); // No zero percents

    // Let's pick a logarithmic curve.
    let factor = f64::log(percent as f64, 100.0);
    u64::max((MAX_MILLISECONDS - (MAX_MILLISECONDS * factor)) as u64, 1)
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    if cli.reset {
        reset(cli.deployment_url.clone()).await;
        return;
    }

    let max_vacation_ms = Arc::new(AtomicU64::new(percentile_to_ms_delay(50)));
    let max_work_ms = Arc::new(AtomicU64::new(percentile_to_ms_delay(50)));

    if !cli.no_santa {
        tokio::spawn(santa(cli.deployment_url.clone(), max_work_ms.clone()));
    }
    for _ in 0..cli.reindeer {
        tokio::spawn(worker(
            cli.deployment_url.clone(),
            WorkerType::Reindeer,
            max_vacation_ms.clone(),
        ));
    }
    for _ in 0..cli.elves {
        tokio::spawn(worker(
            cli.deployment_url.clone(),
            WorkerType::Elf,
            max_vacation_ms.clone(),
        ));
    }

    let mut convex = ConvexClient::new(&cli.deployment_url).await.unwrap();
    // Wait for existing work to be done and for new group of workers to be ready!
    let mut sub = convex
        .subscribe("speed:getSpeeds", maplit::btreemap! {})
        .await
        .unwrap();
    while let Some(result) = sub.next().await {
        //dbg!(&result);
        if let FunctionResult::Value(Value::Object(speeds)) = result {
            if let Some(Value::Float64(percentage)) = speeds.get("vacationSpeed") {
                let vacation_ms = percentile_to_ms_delay(*percentage as u8);
                //println!("Vacation ms set to {}", vacation_ms);
                max_vacation_ms.store(vacation_ms, std::sync::atomic::Ordering::Relaxed);
            }
            if let Some(Value::Float64(percentage)) = speeds.get("workSpeed") {
                let work_ms = percentile_to_ms_delay(*percentage as u8);
                //println!("Work ms set to {}", work_ms);
                max_work_ms.store(work_ms, std::sync::atomic::Ordering::Relaxed);
            }
        }
    }
}

async fn reset(deployment_url: String) {
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    convex
        .mutation("santa:reset", maplit::btreemap! {})
        .await
        .unwrap();
}

async fn santa(deployment_url: String, max_work_ms: Arc<AtomicU64>) {
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    let mut rng = rand::rngs::StdRng::from_entropy();
    loop {
        // Wait for a new group of workers to be ready!
        let mut sub = convex
            .subscribe("santa:newGroupReady", maplit::btreemap! {})
            .await
            .unwrap();
        let mut job = String::new();
        while let Some(result) = sub.next().await {
            if let FunctionResult::Value(Value::String(given_job)) = result {
                job = given_job;
                break;
            }
        }
        drop(sub);
        let worker_type: WorkerType = job.as_str().into();
        println!("Ho! Ho! Ho! {}", worker_type.santa_command());
        // Kick off work.
        convex
            .mutation(
                "santa:dispatchGroup",
                maplit::btreemap! {
                    "work".to_owned() => Value::String(job),
                },
            )
            .await
            .unwrap();
        println!("----------");
        // Let the group "work" with Santa.
        tokio::time::sleep(Duration::from_millis(
            rng.gen_range(0..max_work_ms.load(std::sync::atomic::Ordering::Relaxed)),
        ))
        .await;
        // Release them from their duties.
        convex
            .mutation("santa:releaseGroup", maplit::btreemap! {})
            .await
            .unwrap();
    }
}

async fn worker(deployment_url: String, worker_type: WorkerType, max_vacation_ms: Arc<AtomicU64>) {
    let mut rng = rand::rngs::StdRng::from_entropy();
    let worker_id = format!("{0:x}", rng.gen::<u16>());
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    let result = convex
        .mutation(
            "workers:insertReadyWorker",
            maplit::btreemap! {
                "workerType".to_owned() => Value::String(worker_type.table_name().to_owned()),
            },
        )
        .await
        .unwrap();
    let our_id = if let FunctionResult::Value(Value::Id(our_id)) = result {
        our_id
    } else {
        panic!("Not an ID back from insertReadyWorker?");
    };

    loop {
        let mut sub = convex
            .subscribe(
                "workers:isTimeToWork",
                maplit::btreemap! {"id".to_owned() => Value::Id(our_id.clone())},
            )
            .await
            .unwrap();
        // Wait for santa to tell us to go.
        while let Some(result) = sub.next().await {
            if let FunctionResult::Value(Value::Boolean(true)) = result {
                break;
            }
        }
        drop(sub);
        worker_type.describe_work(&worker_id);
        // Wait until Santa releases us to go on vacation
        let mut sub = convex
            .subscribe(
                "workers:isTimeToVacation",
                maplit::btreemap! {"id".to_owned() => Value::Id(our_id.clone())},
            )
            .await
            .unwrap();
        while let Some(result) = sub.next().await {
            if let FunctionResult::Value(Value::Boolean(true)) = result {
                break;
            }
        }

        // Go on "vacation" by just waiting awhile to come back and register as ready.
        tokio::time::sleep(Duration::from_millis(
            rng.gen_range(0..max_vacation_ms.load(std::sync::atomic::Ordering::Relaxed)),
        ))
        .await;

        // Register ourselves as "back from vacation"
        convex
            .mutation(
                "workers:markBackFromVacation",
                maplit::btreemap! {"id".to_owned() => Value::Id(our_id.clone())},
            )
            .await
            .unwrap();
    }
}
