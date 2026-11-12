import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import init_database
from backend.app.repositories.calendar_repository import bulk_seed_calendar_days
from backend.app.repositories.observation_repository import bulk_upsert_observations
from backend.app.repositories.seed_menu_data import seed_menu
from backend.app.repositories.settings_repository import get_operator_settings
from backend.ml.simulate import export_simulator_csv, simulate_cafeteria_dataset


def run_seed():
    print("=== Leftover Radar: Seeding MongoDB & Generating Dataset ===")

    # 1. Initialize DB validators and compound indexes
    print("[1/5] Initializing MongoDB collections, validators, and indexes...")
    init_database()

    # 2. Seed Menu Items
    print("[2/5] Seeding 20 menu items (Indian campus flavor)...")
    menu_count = seed_menu()
    print(f"      Seeded {menu_count} menu items.")

    # 3. Generate simulation data and write CSV + DATA_CARD
    print("[3/5] Simulating 180 days of cafeteria observations (~4,000+ rows)...")
    csv_path, stats = export_simulator_csv()
    print(f"      Exported dataset to {csv_path}")
    print(f"      Rows: {stats['total_rows']}, Sold out rate: {stats['sold_out_pct']}% (calibrated ~8-12%)")

    # 4. Ingest observations into MongoDB service_observations via bulk_write
    print("[4/5] Ingesting observations into MongoDB service_observations...")
    obs_records, _ = simulate_cafeteria_dataset()
    batch_size = 500
    total_upserted = 0
    total_modified = 0

    for i in range(0, len(obs_records), batch_size):
        chunk = obs_records[i:i + batch_size]
        res = bulk_upsert_observations(chunk)
        total_upserted += res["upserted"]
        total_modified += res["modified"]
    print(f"      Successfully populated service_observations (upserted: {total_upserted}, modified: {total_modified}).")

    # 5. Seed Calendar Days & Default Settings
    print("[5/5] Ingesting academic calendar context and operator settings...")
    # Generate calendar entries
    from datetime import datetime, timezone

    from backend.ml.simulate import generate_calendar_schedule
    cal_schedule = generate_calendar_schedule(datetime(2026, 5, 16, tzinfo=timezone.utc), days_count=180)
    cal_days = [
        {
            "date": cal["date"],
            "date_str": cal["date_str"],
            "campus_event": cal["campus_event"],
            "event_name": cal["event_name"],
            "exam_week": cal["exam_week"],
            "holiday": cal["holiday"],
            "holiday_name": cal["holiday_name"],
            "weather": cal["weather"]
        }
        for cal in cal_schedule.values()
    ]
    bulk_seed_calendar_days(cal_days)

    # Verify settings
    settings_doc = get_operator_settings()
    print(f"      Operator Newsvendor settings verified: waste_cost={settings_doc['waste_cost']}, stockout_cost={settings_doc['stockout_cost']}.")

    print("\n[OK] Seeding complete! Database is fully populated with clean, validated records.")

if __name__ == "__main__":
    run_seed()
