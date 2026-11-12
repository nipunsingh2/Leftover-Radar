# Leftover Radar: Dataset Card (Synthetic Campus Cafeteria Data)

## 1. Overview & Provenance
- **Dataset Name**: Campus Cafeteria Demand & Observation Stream (`sample_observations.csv`)
- **Provenance**: Synthetic / Generated via `backend.ml.simulate.py` (Fixed seed: `42`).
- **Data Period**: 180 consecutive days (`2026-05-16` to `2026-11-11`), spanning Summer Term, Monsoon Semester, Midterms, Annual Cultural Fest, Diwali Break, and Pre-finals.
- **Granularity**: Date × Meal Period (`breakfast`, `lunch`, `dinner`) × Menu Item.
- **Total Records**: 4,036 observations across rotating service menus.
- **Ethical & Accuracy Disclaimer**: All records in this dataset are simulated. Metrics evaluated on this dataset describe this simulator only and must not be claimed as real-world cafeteria accuracy without field validation against actual POS systems.

---

## 2. Generative Process & Latent Demand Equation

Latent unconstrained demand $\lambda_{i,s}$ for item $i$ during service $s$ is governed by:

$$\lambda_{i,s} = \text{base\_popularity}[i] \times \text{period\_factor}[s, \text{category}] \times \text{weekday\_factor}[\text{dow}] \times \text{term\_phase} \times \text{event\_factor} \times \text{weather\_factor} \times \text{menu\_competition}$$

$$\text{demand} \sim \text{NegativeBinomial}(\text{mean}=\lambda_{i,s}, \text{dispersion}=k=12.0)$$

### Learnable Factors
1. **Base Popularity**: Ranges from 35 (specialty dishes) to 120 (Chicken Biryani).
2. **Meal Period**: Breakfast mains (Dosa, Idli, Poha, Paratha) active in morning; Biryanis, Rajma, Paneer active in lunch/dinner; snacks active throughout.
3. **Day of Week**:
   - Friday: Spikes for Chicken Biryani (+25%) and afternoon snacks.
   - Weekends: Late hearty breakfasts (+20%), lower lunch/dinner attendance (-22%).
   - Mondays: Modest campus dip (-8%).
4. **Academic Term Phase**:
   - Summer break (May-June): Reduced campus footprint (-30%).
   - Monsoon semester: Normal full capacity.
   - Exam week (September): Irregular snacking and late-night comfort foods (+15%).
   - Diwali break (Late October / Early November): Campus half-empty (-55%).
5. **Contextual Drivers**:
   - Campus Cultural Fest (Oct 15–18): Major traffic surge (+25%).
   - Rainy Weather: Hot snacks, Dal Tadka, and Maggi demand surges (+22%); cold beverages drop (-20%).
6. **Menu Competition**: Menus rotate 6–10 dishes per service. Larger menus modestly diffuse individual item volume (-1.8% per extra dish).

---

## 3. Operator Planning & Censored Demand (Stock-outs)

Cafeteria managers do not have access to future demand. They plan preparation based on recent observed sales plus an operational buffer:

$$\text{portions\_prepared} = \text{round}\Big(\text{recent\_avg} \times (1.0 + \text{buffer} + \epsilon)\Big)$$

- **Realized Sales**: $\text{portions\_sold} = \min(\text{latent\_demand}, \text{portions\_prepared})$.
- **Stockout / Censoring Indicator**: $\text{sold\_out} = (\text{latent\_demand} \ge \text{portions\_prepared})$.
- **Empirical Censoring Rate**: **11.50%** (464 sold-out events out of 4,036 service rows), closely matching the realistic 8%–12% target specified in operations literature.

---

## 4. Menu Composition (20 Dishes)

| Item ID | Dish Name | Category | Base Price | Special Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| `paneer_rice_bowl` | Paneer Rice Bowl | main | ₹90 | Staple lunch/dinner favorite |
| `dal_tadka_rice` | Dal Tadka + Steamed Rice | main | ₹70 | Vegan staple, rain boost |
| `rajma_chawal` | Punjabi Rajma Chawal | main | ₹80 | North Indian classic |
| `chole_bhature` | Chole Bhature (2 pcs) | main | ₹85 | Weekend & holiday favorite |
| `veg_biryani` | Hyderabadi Veg Dum Biryani | main | ₹95 | Fragrant main |
| `chicken_biryani` | Special Chicken Biryani | main | ₹130 | Non-veg Friday bestseller |
| `egg_curry_rice` | Homestyle Egg Curry + Rice | main | ₹85 | Protein main |
| `masala_dosa` | Crispy Masala Dosa | breakfast | ₹60 | Breakfast bestseller |
| `idli_sambar` | Steamed Idli Sambar (4 pcs) | breakfast | ₹45 | Light breakfast staple |
| `poha` | Indori Batata Poha | breakfast | ₹35 | Quick morning staple |
| `aloo_paratha` | Tawa Aloo Paratha with Curd | breakfast | ₹50 | Hearty breakfast staple |
| `veg_sandwich` | Cheese Veg Grilled Sandwich | snack | ₹55 | All-day quick bite |
| `maggi` | Classic Butter Masala Maggi | snack | ₹40 | Exam week & rainy booster |
| `samosa` | Crispy Punjabi Samosa (2 pcs) | snack | ₹25 | Afternoon tea snack |
| `cold_coffee` | Classic Thick Cold Coffee | beverage | ₹50 | Sunny day bestseller |
| `fruit_bowl` | Seasonal Fresh Fruit Bowl | snack | ₹45 | Healthy option |
| `gulab_jamun` | Warm Gulab Jamun (2 pcs) | dessert | ₹35 | Dinner sweet treat |
| `avocado_sourdough` | Avocado Sourdough Toast | breakfast | ₹110 | Introduced mid-history (Oct 15) |
| `special_tacos` | Chef Special Mexican Tacos | main | ₹95 | Introduced mid-history (Oct 25) |
| `mutton_roll` | Kolkata Mutton Roll | snack | ₹120 | Discontinued mid-history (Sep 15) |

---

## 5. Schema Validation Rules (Section 4.3 & 8.1)
- `service_date`: ISO YYYY-MM-DD parsed to service-day convention (IST midnight, stored as UTC BSON Date).
- `service_period`: Controlled enum (`breakfast`, `lunch`, `dinner`).
- `portions_prepared` & `portions_sold`: Non-negative integers with strict invariant $\text{portions\_sold} \le \text{portions\_prepared}$.
- `unique(service_date, service_period, item_id)`: Enforced via MongoDB unique compound index.
- `source`: Tagged as `simulated`, `manual_entry`, or `csv_import`.
