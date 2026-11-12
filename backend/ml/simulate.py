import csv
import json
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

# Base popularity (mean servings under normal conditions)
BASE_POPULARITY = {
    "paneer_rice_bowl": 85,
    "dal_tadka_rice": 70,
    "rajma_chawal": 75,
    "chole_bhature": 80,
    "veg_biryani": 90,
    "chicken_biryani": 120,
    "egg_curry_rice": 65,
    "masala_dosa": 85,
    "idli_sambar": 60,
    "poha": 50,
    "aloo_paratha": 55,
    "veg_sandwich": 45,
    "maggi": 60,
    "samosa": 70,
    "cold_coffee": 65,
    "fruit_bowl": 40,
    "gulab_jamun": 50,
    "avocado_sourdough": 35,  # Introduced mid-history
    "special_tacos": 40,      # Introduced mid-history
    "mutton_roll": 50         # Discontinued mid-history
}

ITEM_CATEGORIES = {
    "paneer_rice_bowl": "main",
    "dal_tadka_rice": "main",
    "rajma_chawal": "main",
    "chole_bhature": "main",
    "veg_biryani": "main",
    "chicken_biryani": "main",
    "egg_curry_rice": "main",
    "masala_dosa": "breakfast",
    "idli_sambar": "breakfast",
    "poha": "breakfast",
    "aloo_paratha": "breakfast",
    "veg_sandwich": "snack",
    "maggi": "snack",
    "samosa": "snack",
    "cold_coffee": "beverage",
    "fruit_bowl": "snack",
    "gulab_jamun": "dessert",
    "avocado_sourdough": "breakfast",
    "special_tacos": "main",
    "mutton_roll": "snack"
}

ITEM_PRICES = {
    "paneer_rice_bowl": 90.0,
    "dal_tadka_rice": 70.0,
    "rajma_chawal": 80.0,
    "chole_bhature": 85.0,
    "veg_biryani": 95.0,
    "chicken_biryani": 130.0,
    "egg_curry_rice": 85.0,
    "masala_dosa": 60.0,
    "idli_sambar": 45.0,
    "poha": 35.0,
    "aloo_paratha": 50.0,
    "veg_sandwich": 55.0,
    "maggi": 40.0,
    "samosa": 25.0,
    "cold_coffee": 50.0,
    "fruit_bowl": 45.0,
    "gulab_jamun": 35.0,
    "avocado_sourdough": 110.0,
    "special_tacos": 95.0,
    "mutton_roll": 120.0
}

def generate_calendar_schedule(start_date: datetime, days_count: int = 180) -> Dict[str, Dict[str, Any]]:
    """Builds academic calendar context: terms, exams, holidays, events, weather."""
    schedule = {}
    curr = start_date

    # We will simulate ~180 days: from 2026-05-16 to 2026-11-12
    # Important calendar markers:
    # 2026-05-16 to 2026-06-30: Summer semester / break (lower traffic)
    # 2026-07-15: Monsoon semester starts (high traffic ramp-up)
    # 2026-09-07 to 2026-09-12: Mid-term exam week (irregular hours, comfort food spikes)
    # 2026-10-02: Gandhi Jayanti (holiday)
    # 2026-10-15 to 2026-10-18: Annual Campus Cultural Fest (high traffic, event spikes)
    # 2026-10-28 to 2026-11-02: Diwali Break (campus half-empty)
    # 2026-11-05 to 2026-11-12: Pre-finals prep week
    for i in range(days_count):
        date_str = curr.strftime("%Y-%m-%d")
        dow = curr.weekday() # 0 = Mon, 6 = Sun

        is_holiday = False
        holiday_name = None
        is_exam = False
        is_event = False
        event_name = None

        # Holiday checks
        if curr.month == 8 and curr.day == 15:
            is_holiday = True
            holiday_name = "Independence Day"
        elif curr.month == 10 and curr.day == 2:
            is_holiday = True
            holiday_name = "Gandhi Jayanti"
        elif curr.month == 10 and (28 <= curr.day <= 31):
            is_holiday = True
            holiday_name = "Diwali Vacation"
        elif curr.month == 11 and curr.day in [1, 2]:
            is_holiday = True
            holiday_name = "Diwali Vacation"

        # Exam weeks
        if curr.month == 9 and (7 <= curr.day <= 13):
            is_exam = True

        # Campus events
        if curr.month == 10 and (15 <= curr.day <= 18):
            is_event = True
            event_name = "Campus Pulse Cultural Fest"
        elif dow == 4 and not is_holiday and (i % 21 == 0):
            is_event = True
            event_name = "Campus Sports Tournament"

        # Monsoon weather (July to September high rain probability)
        if curr.month in [7, 8, 9]:
            weather = "rainy" if random.random() < 0.40 else random.choice(["cloudy", "rainy", "clear"])
        else:
            weather = "rainy" if random.random() < 0.08 else random.choice(["clear", "sunny", "cloudy"])

        schedule[date_str] = {
            "date": curr,
            "date_str": date_str,
            "day_of_week": dow,
            "campus_event": is_event,
            "event_name": event_name,
            "exam_week": is_exam,
            "holiday": is_holiday,
            "holiday_name": holiday_name,
            "weather": weather
        }
        curr += timedelta(days=1)

    return schedule

def sample_negative_binomial(mean_val: float, dispersion: float = 40.0) -> int:
    """
    NegativeBinomial parameterized by mean and dispersion (Gamma-Poisson mixture).
    Produces realistic overdispersed cafeteria demand counts with learnable structure.
    """
    if mean_val <= 0.1:
        return 0
    k = max(5.0, dispersion)
    # Gamma sample: shape=k, scale=mean/k
    gamma_sample = np.random.gamma(shape=k, scale=mean_val / k)
    return int(np.random.poisson(gamma_sample))

def simulate_cafeteria_dataset(
    start_date: datetime = datetime(2026, 5, 16, tzinfo=timezone.utc),
    days_count: int = 180,
    seed: int = 42
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Generates ~6,000 to 8,000 realistic observation rows across 180 days with:
    - Rotating menus (6-10 items per service)
    - Indian campus flavor items
    - Learnable features (dow, event, weather, holiday, exam, price)
    - Realistic operator over-preparation bias and calibrated censoring (~8-12% sold-out)
    """
    random.seed(seed)
    np.random.seed(seed)

    calendar_schedule = generate_calendar_schedule(start_date, days_count)
    observations: List[Dict[str, Any]] = []

    # Track item recent sales for operator planning behavior
    recent_sales_tracker: Dict[Tuple[str, str], List[int]] = {}

    staple_items = [
        "paneer_rice_bowl", "dal_tadka_rice", "masala_dosa",
        "idli_sambar", "poha", "veg_sandwich", "maggi", "cold_coffee"
    ]

    for date_str, cal in sorted(calendar_schedule.items()):
        curr_dt = cal["date"]
        dow = cal["day_of_week"]
        is_weekend = dow in [5, 6]
        is_event = cal["campus_event"]
        is_exam = cal["exam_week"]
        is_holiday = cal["holiday"]
        weather = cal["weather"]

        # Term phase multiplier
        if curr_dt.month in [5, 6]:
            term_factor = 0.70  # summer reduced capacity
        elif is_holiday:
            term_factor = 0.45  # campus half empty
        elif is_exam:
            term_factor = 1.15  # students stay late on campus
        else:
            term_factor = 1.00

        for period in ["breakfast", "lunch", "dinner"]:
            # 1. Determine active menu items for this service (rotating menu: 6-10 items)
            eligible_items = []
            for item_id, cat in ITEM_CATEGORIES.items():
                # Check introduction and discontinuation dates
                if item_id == "avocado_sourdough" and curr_dt < datetime(2026, 10, 15, tzinfo=timezone.utc):
                    continue
                if item_id == "special_tacos" and curr_dt < datetime(2026, 10, 25, tzinfo=timezone.utc):
                    continue
                if item_id == "mutton_roll" and curr_dt > datetime(2026, 9, 15, tzinfo=timezone.utc):
                    continue

                # Category-period match
                if period == "breakfast":
                    if cat in ["breakfast", "beverage"] or item_id in ["veg_sandwich", "fruit_bowl"]:
                        eligible_items.append(item_id)
                elif period == "lunch":
                    if cat in ["main", "snack", "beverage", "dessert"] and cat != "breakfast":
                        eligible_items.append(item_id)
                elif period == "dinner":
                    if cat in ["main", "dessert"] or item_id in ["maggi", "veg_sandwich"]:
                        eligible_items.append(item_id)

            # Rotation selection: staples almost always present, others rotated
            selected_items = []
            for itm in eligible_items:
                if itm in staple_items:
                    # 90% chance of appearing
                    if random.random() < 0.90:
                        selected_items.append(itm)
                else:
                    # Rotating specials 55% chance
                    if random.random() < 0.55:
                        selected_items.append(itm)

            # Ensure between 6 and 10 items
            if len(selected_items) < 6:
                for itm in eligible_items:
                    if itm not in selected_items:
                        selected_items.append(itm)
                    if len(selected_items) >= 6:
                        break
            if len(selected_items) > 10:
                selected_items = selected_items[:10]

            menu_competition_factor = 1.0 - (0.018 * (len(selected_items) - 6))

            # 2. Simulate demand and operator preparation for each selected dish
            for itm in selected_items:
                cat = ITEM_CATEGORIES[itm]
                base_pop = BASE_POPULARITY[itm]

                # Period category factor
                if period == "breakfast" and cat == "breakfast":
                    p_factor = 1.0
                elif period == "lunch" and cat == "main":
                    p_factor = 1.15
                elif period == "dinner" and cat == "main":
                    p_factor = 0.95
                elif period in ["lunch", "dinner"] and cat in ["snack", "beverage", "dessert"]:
                    p_factor = 0.85
                else:
                    p_factor = 0.80

                # Weekday factors
                if dow == 0:  # Monday slight dip
                    w_factor = 0.92
                elif dow == 4:  # Friday
                    w_factor = 1.25 if itm == "chicken_biryani" or cat == "snack" else 0.95
                elif is_weekend:
                    w_factor = 1.20 if period == "breakfast" else 0.78
                else:
                    w_factor = 1.02

                # Context factors
                ev_factor = 1.25 if is_event else 1.0
                if weather == "rainy":
                    wx_factor = 1.22 if cat in ["snack"] or itm in ["dal_tadka_rice", "maggi", "samosa"] else (0.80 if itm == "cold_coffee" else 1.0)
                else:
                    wx_factor = 1.0

                # Mean latent demand lambda
                lam = base_pop * p_factor * w_factor * term_factor * ev_factor * wx_factor * menu_competition_factor

                # Sample overdispersed demand
                latent_demand = sample_negative_binomial(lam, dispersion=12.0)
                latent_demand = max(3, latent_demand)

                # Operator planning behavior:
                # Operators know the general demand level and add a safe operational buffer
                # so stock-outs only occur ~8-12% of the time.
                hist_key = (itm, period)
                past_sales = recent_sales_tracker.get(hist_key, [])

                if len(past_sales) >= 5:
                    recent_avg = float(np.mean(past_sales[-14:]))
                else:
                    recent_avg = float(lam)

                # Safe operational buffer so stock-outs occur ~8-12% of the time
                prep_buffer = 0.55 if base_pop >= 75 else 0.59
                noise = np.random.normal(loc=0.0, scale=0.03)
                portions_prepared = int(round(recent_avg * (1.0 + prep_buffer + noise)))
                portions_prepared = max(int(recent_avg * 1.20), portions_prepared)
                portions_prepared = max(8, portions_prepared)

                # Actual sales is bounded by preparation (realistic censoring!)
                if latent_demand >= portions_prepared:
                    portions_sold = portions_prepared
                    sold_out = True
                else:
                    portions_sold = latent_demand
                    sold_out = False

                # Update recent sales tracker (using actual observed sold)
                recent_sales_tracker.setdefault(hist_key, []).append(portions_sold)

                observations.append({
                    "service_date": curr_dt,
                    "service_date_str": date_str,
                    "service_period": period,
                    "item_id": itm,
                    "category": cat,
                    "price": ITEM_PRICES[itm],
                    "portions_prepared": portions_prepared,
                    "portions_sold": portions_sold,
                    "sold_out": sold_out,
                    "latent_demand": latent_demand,
                    "context": {
                        "campus_event": is_event,
                        "exam_week": is_exam,
                        "holiday": is_holiday,
                        "weather": weather
                    },
                    "source": "simulated"
                })

    # Summary stats
    total_rows = len(observations)
    sold_out_rows = sum(1 for o in observations if o["sold_out"])
    sold_out_pct = round((sold_out_rows / total_rows) * 100, 2)

    stats = {
        "total_rows": total_rows,
        "sold_out_count": sold_out_rows,
        "sold_out_pct": sold_out_pct,
        "start_date": list(calendar_schedule.keys())[0],
        "end_date": list(calendar_schedule.keys())[-1],
        "unique_items": len(set(o["item_id"] for o in observations)),
        "days": days_count
    }

    return observations, stats

def export_simulator_csv(output_path: Optional[Path] = None) -> Tuple[str, Dict[str, Any]]:
    csv_path = output_path or (ROOT_DIR / "data" / "sample_observations.csv")
    os.makedirs(csv_path.parent, exist_ok=True)

    obs, stats = simulate_cafeteria_dataset()

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "service_date", "service_period", "item_id", "category",
            "price", "portions_prepared", "portions_sold", "sold_out",
            "campus_event", "exam_week", "holiday", "weather", "source"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for o in obs:
            writer.writerow({
                "service_date": o["service_date_str"],
                "service_period": o["service_period"],
                "item_id": o["item_id"],
                "category": o["category"],
                "price": o["price"],
                "portions_prepared": o["portions_prepared"],
                "portions_sold": o["portions_sold"],
                "sold_out": o["sold_out"],
                "campus_event": o["context"]["campus_event"],
                "exam_week": o["context"]["exam_week"],
                "holiday": o["context"]["holiday"],
                "weather": o["context"]["weather"],
                "source": o["source"]
            })

    return str(csv_path), stats

if __name__ == "__main__":
    path, stats = export_simulator_csv()
    print(f"Exported simulated dataset to {path}")
    print(json.dumps(stats, indent=2))
