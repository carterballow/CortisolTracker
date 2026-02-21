# Project Proposal (Draft) — Cortisol Proxy Tracker Dashboard (Data4Good / Public Health Track)

## 1) Project Overview.

A mobile dashboard that automatically imports Apple Health data (sleep + activity + heart metrics + body metrics) and uses a trained ML model to estimate a **personalized cortisol-like stress score** and **weekly rhythm**, then compares trends against demographic cohorts (age/sex/BMI/health factors) using public datasets.

---

## 2) Problem & motivation

Cortisol is important for stress and health, but lab testing is inconvenient and manual logging is unrealistic. We want to reduce friction by:

* **automating data capture** from the phone/watch (Apple Health)
* **estimating a cortisol proxy** from signals people already generate
* **making weekly comparisons meaningful** by benchmarking against demographic cohorts

---

## 3) What we are building (user-facing features)

### Core dashboard (MVP)

1. **Automatic data import** (daily + weekly views)

   * Sleep duration/consistency (and stages if available)
   * Activity: steps, workouts, active energy
   * Heart: resting HR, HRV (SDNN), average HR
   * Body metrics: height/weight → BMI

2. **Personalized Cortisol Proxy Score**

   * Output: “Cortisol Proxy Index” (0–100) + confidence indicator
   * Also produce a **Weekly Rhythm Score** (how consistent and healthy the weekly pattern looks)

3. **Cohort comparison**

   * “Compared to people like you” view by:

     * age band, sex (if available), BMI band
   * Show percentile and trend deltas (“up vs last week”, “above/below cohort median”)

4. **Explainability / “Why did my score change?”**

   * Top 3 contributors for the week (e.g., sleep debt, HRV drop, training load spike)

### Stretch features (if time)

* Baseline calibration (model adapts to the user over time)
* Experiment mode (“try earlier bedtime for 7 days” and compare before/after)
* Anomaly alerts (“this week looks unusual vs your baseline”)

---

## 4) Data sources

### Personal data (automatic)

* Apple Health (from iPhone + Apple Watch) via **HealthKit**
* Metrics: sleep, workouts, steps/energy, HRV, resting HR, height, weight

### Public data (for cohort benchmarking)

* Public health datasets (e.g., CDC/NHANES-style sources) to build demographic distributions and health baselines:

  * age/sex/BMI and broad health indicators
* If direct cortisol ground truth is unavailable, we will be explicit that our output is a **cortisol proxy / stress-hormone index** inspired by known physiology and validated against related recovery/stress measures.

---

## 5) Technical approach (pipeline)

### Step A — Ingestion & feature engineering

1. Request HealthKit permissions
2. Pull daily samples (last 7/30 days)
3. Aggregate into features like:

   * sleep duration, sleep regularity, sleep debt (vs user baseline)
   * workout load (minutes + intensity proxies), active energy, steps
   * HRV daily average, resting HR daily average
   * BMI computed from height/weight

### Step B — Model inference (trained AI model)

* Train a supervised model if we find datasets with cortisol labels; otherwise train a robust proxy model that predicts a stress/recovery target and outputs a cortisol-like score.
* Start with interpretable + fast models:

  * baseline: linear / logistic model
  * improved: gradient-boosted trees (XGBoost/LightGBM)
* Output:

  * daily Cortisol Proxy Index (0–100)
  * weekly Rhythm Score (0–100)
  * confidence score (based on missingness + mode
