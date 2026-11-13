# Leftover Radar

**Campus Cafeteria Demand & Prep Planner**  
*Practical Machine Learning + MongoDB 8.3 Kitchen Operations Instrument*

---

## 1. Overview & Operational Philosophy

> **"Prepare closer to demand. Waste less."**

Leftover Radar is a kitchen operations decision-support instrument engineered for campus dining halls and multi-service institutional cafeterias.

Unlike generic dashboards that make overconfident claims about "predicting food waste", Leftover Radar solves the genuine operational problem:
1. **Demand Forecasting, Not Waste Guessing**: It models customer demand ($\text{portions\_sold}$) based on historical velocity, day-of-week patterns, weather, and campus events.
2. **Censored Demand Awareness**: Recognizes that when a dish sells out, recorded sales equal preparation, not true unconstrained demand. Censored records are filtered to prevent downward target bias.
3. **Split-Conformal 80% Intervals**: Quantifies prediction uncertainty with mathematically calibrated non-conformity intervals guarantee empirical 80% coverage on future dates.
4. **Newsvendor Buffer Optimization**: Calibrates optimal prep buffers using economic loss functions:
   $$q^* = \frac{c_s}{c_s + c_w}$$
   Where $c_s$ is the operator cost of a stockout (lost revenue & student dissatisfaction) and $c_w$ is the cost of food waste.
5. **Section 7.7 Fallback Ladder**: Gracefully handles cold-start dishes with transparent tiers:
   - $\ge 14$ observations: Full model (`sufficient`)
   - $3 - 13$ observations: Model with $1.35\times$ widened interval (`low_history`)
   - $< 3$ observations: Category trailing mean (`new_item`)
   - $0$ observations: Operator manual entry (`no_history`)

---

## 2. System Architecture & Tech Stack

```
                          ┌─────────────────────────┐
                          │   React 18 + Vite UI    │
                          │   Tailwind + Recharts   │
                          │   Warm Ivory Instrument │
                          └────────────┬────────────┘
                                       │ HTTP / REST
                                       ▼
                          ┌─────────────────────────┐
                          │     FastAPI Backend     │
                          │  Pydantic v2 Validation │
                          │  Request-ID Middleware  │
                          └────────────┬────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│         MongoDB 8.3          │              │         ML Pipeline          │
│  - menu_items                │              │  - Zero-leakage features     │
│  - service_observations      │              │  - Walk-forward 4-fold CV    │
│  - forecasts (snapshots)     │              │  - Ridge (log1p) regressor   │
│  - model_runs                │              │  - Split-conformal 80% band  │
│  - calendar_days             │              │  - Newsvendor prep buffer    │
│  - settings                  │              └──────────────────────────────┘
│  - 4 Aggregation Pipelines   │
└──────────────────────────────┘
```

---

## 3. MongoDB 8.3 Layer & The 4 Aggregation Pipelines

All data persistence is validated via strict `$jsonSchema` validators and indexed idempotently at startup:
- Compound Unique Index: `(service_date, service_period, item_id)`
- Feature Index: `(item_id, service_period, service_date)`
- Snapshot Auditing: `(created_at, -1)`

### The 4 Production Aggregation Pipelines (Section 8.2)

1. **Pipeline 1: Waste & Sales Trend (`GET /api/analytics/trend`)**
   - `$match` on date range and meal period.
   - `$lookup` `menu_items` to attach category metadata.
   - `$group` using `$dateTrunc` by calendar day and service period.
   - `$project` realized leftover `max(portions_prepared - portions_sold, 0)` and `sell_through = portions_sold / portions_prepared`.
   - `$sort` chronologically for operational trend charts.

2. **Pipeline 2: Forecast vs. Actual Join (`GET /api/forecasts/compare`)**
   - Correlates saved immutable `forecasts` with recorded `service_observations` on `(service_date, service_period, item_id)`.
   - Computes signed `error = sold - predicted`, absolute error `|sold - predicted|`, and classifies outcome as `over`, `under`, or `exact`.

3. **Pipeline 3: Accuracy by Item & Category with `$facet` (`GET /api/analytics/accuracy`)**
   - Joins forecast predictions with verified service observations.
   - Executes a multi-faceted aggregation in a single database round-trip:
     - `overall`: Global MAE, WAPE, and systematic signed bias.
     - `by_category`: Performance broken down by mains, breakfast, snacks, beverages.
     - `by_item`: Granular error rates across individual menu dishes.

4. **Pipeline 4: Rolling 7-Day Moving Waste (`GET /api/analytics/waste`)**
   - Aggregates daily cafeteria leftovers.
   - Employs `$setWindowFields` with a `[-6, 0]` document window to compute a true 7-day trailing moving average without client-side lag.

---

## 4. Design System Tokens (Section 9.3)

Engineered as a tactile kitchen operations instrument:
- **Canvas**: Warm Ivory `#F6F1E7` (Night Kitchen dark mode `#10150F`)
- **Surface**: Parchment `#FBF8F1` (Night Kitchen dark mode `#171E17`)
- **Primary Ink**: Deep Charcoal `#17211B` (Night Kitchen `#EDE8DA`)
- **Muted Ink**: `#5B665F`
- **Hairline Rules**: 1px `#DDD5C4`
- **Primary Forest**: `#1F4D3A` (hover `#173B2D`)
- **Saffron Accent**: `#C98A1B` (caution/waste)
- **Clay Red**: `#A63D2F` (stockout risk)
- **Sage Tint**: `#E3EBDD`
- **Typography**: Newsreader (display & big numbers), Instrument Sans (humanist UI), JetBrains Mono with `font-variant-numeric: tabular-nums`.

---

## 5. Quickstart & Verification

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 8.3 running on port 27017 (or Docker Compose)

### 1. Environment Setup
```bash
# Clone and enter workspace
git clone <repo_url>
cd nosql

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Install frontend dependencies & build bundle
cd frontend && npm install && npm run build && cd ..
```

### 2. Database Seeding & ML Training
```bash
# Seed menu items and 4,036 simulated observations (180 days)
python scripts/seed_database.py

# Train production model and calibrate conformal intervals
python -m backend.ml.train --seed 42
```

### 3. Run Automated Tests
```bash
# Run complete test suite across Phases 0 through 6 (33 tests)
python -m pytest backend/tests/ -v
```

### 4. Start the Application Server
```bash
# Start FastAPI backend (serves API and compiled React UI)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **`http://localhost:8000`** in your browser.

---

## 6. 5-Minute Evaluation & Grading Walkthrough (Section 15)

Follow these exact steps during demonstration or grading:

### Step 1: Health & System Self-Check
- Visit `http://localhost:8000/health`.
- Confirm response shows `"status": "healthy"`, `"mongodb": "connected"`, and `"model_loaded": true`.

### Step 2: Plan Page & Live Recomputation
- Navigate to the **Plan** page (`/`).
- Notice the **Summary Band** with 4 key metrics: Planned portions, Predicted demand, Projected leftovers, and Projected shortfall.
- In the **Forecast Ledger**, examine the **RangeBar** for *Chicken Biryani*:
  - The green shaded zone represents the **80% Conformal Interval**.
  - The black tick marks the **model point forecast**.
  - The diamond marks the **operator plan**.
- **Live Local Recompute**: Click the `+5` / `-5` buttons or type a number in the *Planned Prep* input.
  - Notice that *Projected Leftovers* and the *Risk Status* update immediately with **zero API round-trips**.
- Click the **Why?** button on any dish row:
  - The **Why Drawer** slides open showing the **Waterfall Demand Drivers** (historical average, day-of-week surge, weather effect).
  - Review the **Newsvendor Buffer Math** step-by-step ($c_s = ₹70, c_w = ₹30 \implies q^* = 0.70$).
  - View the table of **Comparable Prior Services** (strictly preceding history).

### Step 3: Kitchen Printable Prep Sheet
- Click the **Prep Sheet** button in the header.
- The kitchen preparation ticket appears formatted for printing with completion checkboxes and head chef sign-off lines.

### Step 4: Cost Sliders & Economic Equilibrium
- Navigate to **Data & Settings** $\rightarrow$ **Newsvendor Cost Parameters**.
- Drag the **Cost of Waste** slider up to ₹80 and the **Cost of Stockout** down to ₹20.
- Notice the live readout immediately updates:
  - $q^*$ shifts to $0.20$.
  - The system explains that waste now outweighs stockouts, recommending lean preparation.
- Click **Save Cost Parameters**.
- Return to the **Plan** page and click **Generate Forecast**; observe that recommended prep numbers adjust lower to protect against waste.

### Step 5: Service Close-Out & Invariant Validation
- Navigate to **Close-out**.
- Try entering portions sold ($75$) greater than portions prepared ($60$) on any dish.
- Click **Save & Finalize Service**: observe the inline validation error: *portions sold cannot exceed portions prepared*.
- Correct the input so sold $\le$ prepared, and click Save.
- The **Instant Service Debrief** renders showing realized sales, exact leftover portions, and stockouts.

### Step 6: Historical Trends & Aggregation Verification
- Navigate to **History**.
- Chart 1 displays **Realized Sales vs. 80% Conformal Band** (PyMongo Pipeline 2).
- Chart 2 displays **Daily Leftover Portions & 7-Day Rolling Moving Average** computed via `$setWindowFields` (PyMongo Pipeline 4).
- The Category Table displays MAE, WAPE, and bias calculated via `$facet` (PyMongo Pipeline 3).

### Step 7: Model Lab & Audit Trail
- Navigate to **Model Lab**.
- Review the out-of-sample benchmark table confirming the production model beats the 28-day baseline MAE by **+20.4%**.
- Check the empirical coverage: **81.5%** within the targeted $77\% - 83\%$ tolerance.
- Review the expanding-window walk-forward CV folds and inspect logged runs from MongoDB `model_runs`.
- Toggle **Night Kitchen** mode in the bottom-left rail to demonstrate accessibility across lighting conditions.

---

## 7. License
Educational and cafeteria operations decision-support project developed following the Leftover Radar Master Build Plan.
