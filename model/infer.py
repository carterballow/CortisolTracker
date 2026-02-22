import joblib
import numpy as np

# --- "national average" anchor (your chosen assumption) ---
NATIONAL_MEAN_UG_DL = 10.0
NATIONAL_SD_UG_DL = 5.0

def norm_to_ug_dl(c_norm: float) -> float:
    # treat c_norm like a z-score
    return NATIONAL_MEAN_UG_DL + (c_norm * NATIONAL_SD_UG_DL)

def percent_vs_national_avg(c_ug_dl: float) -> float:
    return ((c_ug_dl - NATIONAL_MEAN_UG_DL) / NATIONAL_MEAN_UG_DL) * 100.0

def level_from_percent(pct: float) -> str:
    # simple bands for demo
    if pct < -15:
        return "Low"
    if pct > 15:
        return "High"
    return "Normal"

def predict_one(avg_hr_intensity_prev_day, steps_prev_day, sleep_minutes_prev_night, sleep_eff_prev_night):
    bundle = joblib.load("model/artifacts/cortisol_model.joblib")
    model = bundle["model"]
    feats = bundle["features"]

    x = {
        "avg_hr_intensity_prev_day": float(avg_hr_intensity_prev_day),
        "steps_prev_day": float(steps_prev_day),
        "sleep_minutes_prev_night": float(sleep_minutes_prev_night),
        "sleep_eff_prev_night": float(sleep_eff_prev_night),
    }

    vec = np.array([[x[f] for f in feats]], dtype=float)
    c_norm = float(model.predict(vec)[0])

    c_ug_dl = norm_to_ug_dl(c_norm)
    pct = percent_vs_national_avg(c_ug_dl)

    return {
        "predicted_wake_cortisol_norm": c_norm,
        "predicted_wake_cortisol_ug_dL": round(c_ug_dl, 2),
        "percent_vs_national_avg": round(pct, 1),
        "level": level_from_percent(pct),
    }

if __name__ == "__main__":
    out = predict_one(
        avg_hr_intensity_prev_day=0.2,
        steps_prev_day=9000,
        sleep_minutes_prev_night=420,
        sleep_eff_prev_night=88,
    )
    print(out)