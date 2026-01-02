import pandas as pd
from datetime import timedelta
import joblib
from sklearn.preprocessing import LabelEncoder
from utils.heat_index import calculate_heat_index, classify_risk


# -------------------------------------
# Load trained ML models
# -------------------------------------
def load_models():
    return {
        "tempmax": joblib.load("models/tempmax_model.pkl"),
        "humidity": joblib.load("models/humidity_model.pkl"),
        "dew": joblib.load("models/dew_model.pkl"),
        "solarradiation": joblib.load("models/solarradiation_model.pkl"),
    }


# -------------------------------------
# Feature lists (MUST match training)
# -------------------------------------
FEATURES = {

    "tempmax": [
        "location_enc","month","dayofyear",
        "tempmax_lag1","tempmax_lag7","tempmax_lag14",
        "humidity_lag1","humidity_lag7",
        "dew_lag1","dew_lag7",
        "temp_roll3","hum_roll3"
    ],

    "humidity": [
        "location_enc","month","dayofyear",
        "humidity_lag1","humidity_lag7","humidity_lag14",
        "tempmax_lag1","tempmax_lag7",
        "hum_roll3"
    ],

    "dew": [
        "location_enc","month","dayofyear",
        "dew_lag1","dew_lag7","dew_lag14",
        "tempmax_lag1","tempmax_lag7",
        "humidity"
    ],

    "solarradiation": [
        "location_enc","month","dayofyear",
        "solarradiation_lag1","solarradiation_lag7","solarradiation_lag14"
    ]
}


# -------------------------------------
# Utility: safe lag access
# -------------------------------------
def safe_lag(series, lag, fallback):
    return series.iloc[-lag] if len(series) >= lag else fallback


# -------------------------------------
# Add lag & rolling features to history
# -------------------------------------
def add_features(df):
    df = df.sort_values(["location", "datetime"]).copy()

    for col in ["tempmax", "humidity", "dew", "solarradiation"]:
        df[f"{col}_lag1"] = df.groupby("location")[col].shift(1)
        df[f"{col}_lag7"] = df.groupby("location")[col].shift(7)
        df[f"{col}_lag14"] = df.groupby("location")[col].shift(14)

    df["temp_roll3"] = (
        df.groupby("location")["tempmax"]
        .rolling(3)
        .mean()
        .reset_index(0, drop=True)
    )

    df["hum_roll3"] = (
        df.groupby("location")["humidity"]
        .rolling(3)
        .mean()
        .reset_index(0, drop=True)
    )

    return df.dropna()


# -------------------------------------
# MAIN: Generate future predictions
# -------------------------------------
def run_predictions(df, models, future_days=15):

    # -----------------------------
    # PREPARE INPUT DATA
    # -----------------------------
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df = df.sort_values(["location", "datetime"])

    # Encode location (same as training)
    le = LabelEncoder()
    df["location_enc"] = le.fit_transform(df["location"])

    # Create historical features
    df = add_features(df)

    locations = df["location"].unique()
    last_date = df["datetime"].max()
    future_dates = pd.date_range(
        last_date + timedelta(days=1),
        periods=future_days
    )

    future_records = []

    # -----------------------------
    # LOOP PER LOCATION
    # -----------------------------
    for loc in locations:

        df_loc = df[df["location"] == loc].copy()
        latest = df_loc.iloc[-1:].copy()

        for date in future_dates:

            latest["datetime"] = date
            latest["month"] = date.month
            latest["dayofyear"] = date.timetuple().tm_yday

            row = {
                "location": loc,
                "datetime": str(date.date())
            }

            # -------- TEMP --------
            row["tempmax"] = models["tempmax"].predict(
                latest[FEATURES["tempmax"]]
            )[0]
            latest["tempmax"] = row["tempmax"]

            # -------- HUMIDITY --------
            row["humidity"] = models["humidity"].predict(
                latest[FEATURES["humidity"]]
            )[0]
            latest["humidity"] = row["humidity"]

            # -------- DEW --------
            row["dew"] = models["dew"].predict(
                latest[FEATURES["dew"]]
            )[0]
            latest["dew"] = row["dew"]

            # -------- SOLAR --------
            row["solarradiation"] = models["solarradiation"].predict(
                latest[FEATURES["solarradiation"]]
            )[0]
            latest["solarradiation"] = row["solarradiation"]

            # -------- UPDATE LAG 1 --------
            latest["tempmax_lag1"] = row["tempmax"]
            latest["humidity_lag1"] = row["humidity"]
            latest["dew_lag1"] = row["dew"]
            latest["solarradiation_lag1"] = row["solarradiation"]

            # -------- UPDATE LAG 7 & 14 (SAFE) --------
            latest["tempmax_lag7"] = safe_lag(df_loc["tempmax"], 7, row["tempmax"])
            latest["humidity_lag7"] = safe_lag(df_loc["humidity"], 7, row["humidity"])
            latest["dew_lag7"] = safe_lag(df_loc["dew"], 7, row["dew"])
            latest["solarradiation_lag7"] = safe_lag(df_loc["solarradiation"], 7, row["solarradiation"])

            latest["tempmax_lag14"] = safe_lag(df_loc["tempmax"], 14, row["tempmax"])
            latest["humidity_lag14"] = safe_lag(df_loc["humidity"], 14, row["humidity"])
            latest["dew_lag14"] = safe_lag(df_loc["dew"], 14, row["dew"])
            latest["solarradiation_lag14"] = safe_lag(df_loc["solarradiation"], 14, row["solarradiation"])

            # -------- UPDATE ROLLING --------
            latest["temp_roll3"] = (
                df_loc["tempmax"].tail(3).mean()
                if len(df_loc) >= 3 else row["tempmax"]
            )

            latest["hum_roll3"] = (
                df_loc["humidity"].tail(3).mean()
                if len(df_loc) >= 3 else row["humidity"]
            )

            # -------- HEAT INDEX --------
            HI_C = calculate_heat_index(row["tempmax"], row["humidity"])
            row["heat_index_C"] = round(HI_C)
            row["risk_level"] = classify_risk(HI_C)

            future_records.append(row)

            # Append predicted row for next-step lags
            df_loc = pd.concat([df_loc, pd.DataFrame([row])], ignore_index=True)

    return future_records
