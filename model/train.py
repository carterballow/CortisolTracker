import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error

from features import build_training_table

FEATURES = [
    "avg_hr_intensity_prev_day",
    "steps_prev_day",
    "sleep_minutes_prev_night",
    "sleep_eff_prev_night",
]
TARGET = "wake_cortisol_norm"
DATA_ROOT = "data/mmash_users"

def main():
    df = build_training_table(DATA_ROOT)
    df.to_csv("model/training_table.csv", index=False)
    print("rows:", len(df))

    if len(df) < 5:
        raise SystemExit("Not enough rows to train. Check data paths / missing users.")

    X = df[FEATURES]
    y = df[TARGET]

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)

    model = Ridge(alpha=1.0)
    model.fit(Xtr, ytr)

    pred = model.predict(Xte)
    print("MAE:", mean_absolute_error(yte, pred))

    joblib.dump({"model": model, "features": FEATURES}, "model/artifacts/cortisol_model.joblib")
    print("saved -> model/artifacts/cortisol_model.joblib")

if __name__ == "__main__":
    main()