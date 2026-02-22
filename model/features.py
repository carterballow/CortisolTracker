from __future__ import annotations

import os
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple

def _find_col(df: pd.DataFrame, contains: List[str]) -> Optional[str]:
    cols = list(df.columns)
    low = [c.lower() for c in cols]
    for i, c in enumerate(low):
        if all(k.lower() in c for k in contains):
            return cols[i]
    return None

def _wake_cortisol_from_saliva(saliva: pd.DataFrame) -> float:
    sample_col = _find_col(saliva, ["sample"]) or _find_col(saliva, ["samples"])
    cort_col = _find_col(saliva, ["cortisol", "norm"]) or _find_col(saliva, ["cortisol"])
    if cort_col is None:
        return np.nan

    if sample_col is not None:
        s = saliva[sample_col].astype(str).str.lower()
        wake = saliva[s.str.contains("wake", na=False)]
        if len(wake) > 0:
            return float(pd.to_numeric(wake[cort_col], errors="coerce").iloc[0])

    ser = pd.to_numeric(saliva[cort_col], errors="coerce").dropna()
    return float(ser.iloc[0]) if len(ser) else np.nan

def _sleep_prev_night_features(sleep: pd.DataFrame) -> Tuple[float, float, int]:
    tst_col = _find_col(sleep, ["total sleep time"]) or "Total Sleep Time (TST)"
    tib_col = _find_col(sleep, ["total minutes in bed"]) or "Total Minutes in Bed"
    eff_col = _find_col(sleep, ["efficiency"]) or "Efficiency"
    out_bed_col = _find_col(sleep, ["out bed date"]) or "Out Bed Date"

    tst = pd.to_numeric(sleep.get(tst_col), errors="coerce")
    tib = pd.to_numeric(sleep.get(tib_col), errors="coerce")
    eff = pd.to_numeric(sleep.get(eff_col), errors="coerce")
    out_bed = pd.to_numeric(sleep.get(out_bed_col), errors="coerce")

    sleep_minutes = float(tst.sum(skipna=True)) if tst is not None else np.nan

    den = float(tib.sum(skipna=True)) if tib is not None else 0.0
    if den > 0 and eff is not None:
        sleep_eff = float((eff * tib).sum(skipna=True) / den)
    else:
        sleep_eff = float(eff.mean(skipna=True)) if eff is not None else np.nan

    wake_day = int(out_bed.max()) if out_bed is not None and out_bed.notna().any() else -1
    return sleep_minutes, sleep_eff, wake_day

def _activity_prev_day_features(acti: pd.DataFrame, prev_day: int) -> Tuple[float, float]:
    hr_col = _find_col(acti, ["hr"]) or "HR"
    steps_col = _find_col(acti, ["steps"]) or "Steps"
    day_col = _find_col(acti, ["day"]) or "day"

    df = acti.copy()
    df[day_col] = pd.to_numeric(df.get(day_col), errors="coerce")
    df[hr_col] = pd.to_numeric(df.get(hr_col), errors="coerce")
    df[steps_col] = pd.to_numeric(df.get(steps_col), errors="coerce")

    prev = df[df[day_col] == prev_day]
    if len(prev) == 0:
        return np.nan, np.nan

    # HR "intensity" = z-score vs user's overall HR
    hr_all = df[hr_col].dropna()
    mu = float(hr_all.mean()) if len(hr_all) else np.nan
    sd = float(hr_all.std()) if len(hr_all) else np.nan

    if np.isfinite(mu) and np.isfinite(sd) and sd > 0:
        intensity = (prev[hr_col] - mu) / sd
        avg_intensity_prev_day = float(intensity.mean(skipna=True))
    else:
        avg_intensity_prev_day = float(prev[hr_col].mean(skipna=True))

    steps_prev_day = float(prev[steps_col].sum(skipna=True))
    return avg_intensity_prev_day, steps_prev_day

def build_training_table(data_root: str) -> pd.DataFrame:
    rows = []

    for i in range(1, 23):
        user_dir = os.path.join(data_root, f"user_{i}")
        if not os.path.isdir(user_dir):
            continue

        act_fp = os.path.join(user_dir, "Actigraph.csv")
        sleep_fp = os.path.join(user_dir, "sleep.csv")
        saliva_fp = os.path.join(user_dir, "saliva.csv")

        if not (os.path.exists(act_fp) and os.path.exists(sleep_fp) and os.path.exists(saliva_fp)):
            continue

        act = pd.read_csv(act_fp)
        sleep = pd.read_csv(sleep_fp)
        saliva = pd.read_csv(saliva_fp)

        wake_cort = _wake_cortisol_from_saliva(saliva)
        sleep_minutes, sleep_eff, wake_day = _sleep_prev_night_features(sleep)
        if wake_day == -1:
            continue

        prev_day = wake_day - 1
        hr_intensity_prev_day, steps_prev_day = _activity_prev_day_features(act, prev_day)

        rows.append({
            "user_id": f"user_{i}",
            "wake_day": wake_day,
            "prev_day": prev_day,
            "avg_hr_intensity_prev_day": hr_intensity_prev_day,
            "steps_prev_day": steps_prev_day,
            "sleep_minutes_prev_night": sleep_minutes,
            "sleep_eff_prev_night": sleep_eff,
            "wake_cortisol_norm": wake_cort,
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=[
        "wake_cortisol_norm",
        "avg_hr_intensity_prev_day",
        "steps_prev_day",
        "sleep_minutes_prev_night",
    ])
    return df