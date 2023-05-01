use std::time::Duration;

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

    /// Clear all state before beginning the simulation
    #[arg(short, long)]
    reset: bool,
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

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    if cli.reset {
        reset(cli.deployment_url.clone()).await;
    }

    tokio::spawn(santa(cli.deployment_url.clone()));
    for _ in 0..9 {
        tokio::spawn(worker(cli.deployment_url.clone(), WorkerType::Reindeer));
    }
    for _ in 0..10 {
        tokio::spawn(worker(cli.deployment_url.clone(), WorkerType::Elf));
    }
    // Wait forever.
    loop {
        tokio::time::sleep(Duration::from_secs(1 << 30)).await;
    }
}

async fn reset(deployment_url: String) {
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    convex
        .mutation("santa:reset", maplit::btreemap! {})
        .await
        .unwrap();
}

async fn santa(deployment_url: String) {
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    loop {
        // Wait for existing work to be done and for new group of workers to be ready!
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
    }
}

async fn worker(deployment_url: String, worker_type: WorkerType) {
    let mut rng = rand::rngs::StdRng::from_entropy();
    let worker_id = format!("{0:x}", rng.gen::<u16>());
    let mut convex = ConvexClient::new(&deployment_url).await.unwrap();
    loop {
        // Register ourselves as "back from vacation"
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

        let mut sub = convex
            .subscribe(
                "workers:timeToWork",
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
        tokio::time::sleep(Duration::from_millis(rng.gen_range(200..1_500))).await;
        // Done working. Let's delete our record.
        let _ = convex
            .mutation(
                "workers:workDone",
                maplit::btreemap! {"id".to_owned() => Value::Id(our_id)},
            )
            .await
            .unwrap();
        // Go on vacation
        tokio::time::sleep(Duration::from_millis(rng.gen_range(700..4_000))).await;
    }
}
