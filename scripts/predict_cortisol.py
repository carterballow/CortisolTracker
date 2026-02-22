import json
import sys
import joblib
import pandas as pd

MODEL_PATH = "model/artifacts/cortisol_model.joblib"

def main():
    payload = json.loads(sys.stdin.read() or "{}")
    rows = payload.get("rows", [])

    if not rows:
        print(json.dumps({"predictions": []}))
        return

    bundle = joblib.load(MODEL_PATH)

    model = bundle["model"]
    features = bundle["features"]

    X = pd.DataFrame(rows)

    for f in features:
        if f not in X.columns:
            X[f] = 0

    X = X[features]

    preds = model.predict(X).tolist()

    out = []
    for row, pred_norm in zip(rows, preds):
        pred_norm = float(pred_norm)
        pred_ugdl = 10 + (pred_norm * 5)
        pct = ((pred_ugdl - 10) / 10) * 100

        if pred_ugdl < 7:
            level = "Low"
        elif pred_ugdl > 13:
            level = "High"
        else:
            level = "Normal"

        out.append({
            "date": row.get("date"),
            "predicted_wake_cortisol_norm": pred_norm,
            "predicted_wake_cortisol_ug_dL": round(pred_ugdl, 2),
            "percent_vs_national_avg": round(pct, 1),
            "level": level,
        })

    print(json.dumps({"predictions": out}))

if __name__ == "__main__":
    main()