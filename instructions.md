# CortisolTracker – Datathon Game Plan (5-Hour Execution Plan)

## 🎯 Objective

Deliver a working end‑to‑end demo that:

1. Shows trends working
2. Shows Home reflecting current cortisol score
3. Has a Fitbit sync button in Profile (real or mocked)
4. Predicts cortisol using a real dataset
5. Compares predicted cortisol vs real dataset cortisol

We are optimizing for:

* Clean pipeline
* Clear demo story
* Working UI
* Believable model

NOT medical perfection.

---

# 🕒 5‑Hour Execution Timeline

## Hour 0–1: Data + Feature Engineering

### 1️⃣ Download Dataset

Use: MMASH dataset (includes activity + sleep + cortisol)

Goal: Create a clean CSV with:

Features:

* Sleep duration
* Activity level / steps
* Heart rate (avg)
* Time of day

Target:

* Cortisol value

Output:

```
processed_cortisol_data.csv
```

Columns example:

```
sleep_hours, steps, avg_hr, time_of_day, cortisol
```

Keep it simple.

---

## Hour 1–2: Model

### 2️⃣ Train Simple Model (Fast + Reliable)

Use:

* Linear Regression OR
* Random Forest Regressor

Do NOT overcomplicate.

Steps:

1. Train/test split (80/20)
2. Fit model
3. Print:

   * R^2 score
   * MAE

Save model:

```
joblib.dump(model, "cortisol_model.pkl")
```

If short on time:

* Hardcode trained coefficients directly into backend.

---

## Hour 2–3: Backend Integration

Add endpoint:

```
POST /predict-cortisol
```

Input JSON:

```
{
  "sleep_hours": 7.5,
  "steps": 8500,
  "avg_hr": 72,
  "time_of_day": 9
}
```

Output JSON:

```
{
  "predicted_cortisol": 14.2,
  "level": "moderate"
}
```

Level mapping:

* < 10 → Low
* 10–18 → Moderate
* > 18 → High

Add explanation string if possible:
"Your lower sleep increased predicted cortisol."

---

## Hour 3–4: Frontend Wiring

### 3️⃣ Home Page

Show:

* Current predicted cortisol score
* Level (Low / Moderate / High)
* Small explanation line

### 4️⃣ Trends Page

Show:

* Line chart of predicted cortisol over time
* Comparison chart: dataset real cortisol vs model prediction

Even if simulated.

If no time-series available:

* Simulate a day curve
* Morning high, midday dip, evening drop

---

## Hour 4–5: Fitbit + Demo Polish

### 5️⃣ Profile Page

Add:

"Connect Fitbit" button

If real OAuth is too heavy:

* Mock connection
* Simulate pulling steps + sleep

For demo:
"Fitbit data synced successfully"

---

# 👥 Team Division (5 People)

### Person 1 – Data

* Clean dataset
* Produce final CSV

### Person 2 – Model

* Train regression
* Save model

### Person 3 – Backend

* Build /predict-cortisol
* Connect model

### Person 4 – Frontend

* Home
* Trends
* Display prediction

### Person 5 – Demo + Fitbit UX

* Profile page
* Mock Fitbit flow
* Prepare pitch story

---

# 📊 Demo Narrative (IMPORTANT)

When presenting, say:

> We trained a predictive model on real physiological data combining sleep, activity, and heart metrics to estimate cortisol levels. Our app integrates wearable-style inputs to generate personalized cortisol trends in real time.

Then show:

1. Enter new sleep/activity values
2. Cortisol score updates
3. Trend chart reflects change

Judges care about pipeline + clarity.

---

# 🚨 Scope Rules

DO:

* Keep model simple
* Keep API clean
* Keep charts clear

DO NOT:

* Try deep learning
* Try real-time Fitbit OAuth if unstable
* Try perfect medical accuracy

---

# ✅ Final Checklist Before Submission

* [ ] /predict-cortisol returns JSON
* [ ] Home reflects current prediction
* [ ] Trends chart renders
* [ ] Dataset used is cited
* [ ] Demo script rehearsed

---

# 🔥 If You Have Extra Time

* Add confidence interval
* Add comparison vs population mean
* Add "what changed" insight line

---

# Bottom Line

Yes, this is achievable in 5 hours with 5 people if you stay focused and avoid overengineering.

The goal is:

Working data → working model → working endpoint → working chart → clean demo.
