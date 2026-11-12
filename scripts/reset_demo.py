import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import get_database
from scripts.seed_database import run_seed


def reset_demo():
    print("=== Resetting Leftover Radar Demo Data ===")
    db = get_database()

    # Drop only the application collections, not the entire database or users
    collections_to_reset = ["service_observations", "forecasts", "calendar_days", "menu_items"]
    for col_name in collections_to_reset:
        db[col_name].delete_many({})
        print(f"Cleared collection: {col_name}")

    print("Re-seeding database from clean simulator...")
    run_seed()
    print("Demo dataset reset successfully!")

if __name__ == "__main__":
    reset_demo()
