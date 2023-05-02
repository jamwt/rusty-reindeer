import os, subprocess, time, traceback, sys
from subprocess import TimeoutExpired

BACKEND_URL = "https://precious-bat-26.convex.cloud"
popen_1 = None
popen_2 = None

while True:
    try:
        # First, reset.
        print("Resetting state...")
        result = subprocess.run(f"cargo run --release -- --reset {BACKEND_URL}", shell=True)
        result.check_returncode()

        # Now, run the two processes.
        # popen_1 = subprocess.Popen(["cargo", "run", "--release",
        #                             "--", 
        #                             "-r", "3", "-e", "8",
        #                             BACKEND_URL, ">>", "group_1.log"], shell=True)
        popen_1 = subprocess.Popen([f"cargo run --release -- -r 3 -e 8 {BACKEND_URL} >> group_1.log"], shell=True)
        popen_2 = subprocess.Popen([f"cargo run --release -- --no-santa -r 6 -e 2 {BACKEND_URL} >> group_2.log"], shell=True)

        while True:
            print("Checking...")
            if popen_1.poll():
                popen_1 = None
                popen_2.kill()
                popen_2 = None
                raise RuntimeError("Process 1 died!")
            if popen_2.poll():
                popen_2 = None
                popen_1.kill()
                popen_1 = None
                raise RuntimeError("Process 1 died!")
            time.sleep(1)
            
    except KeyboardInterrupt:
        if popen_1:
            popen_1.kill()
        if popen_2:
            popen_2.kill()
        sys.exit(0)
    except:
        print("Error during runtime")
        traceback.print_exc()
        print("Sleeping and going again...")
        time.sleep(5)