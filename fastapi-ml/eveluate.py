import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

DATA_PATH = "data/train-all 13 division 2016-2025 weather data (location,date,tempmax,humidity,dew,solarradiation).csv"

# ------------------------------------------------
# Create features ONLY if model requires them
# ------------------------------------------------
def create_required_features(df, feature_names):
    df = df.sort_values(["location", "datetime"]).copy()

    g = df.groupby("location")

    if "location_enc" in feature_names:
        df["location_enc"] = df["location"].astype("category").cat.codes

    if "month" in feature_names:
        df["month"] = df["datetime"].dt.month

    if "dayofyear" in feature_names:
        df["dayofyear"] = df["datetime"].dt.dayofyear

    # -------- LAGS --------
    for lag in [1, 7, 14]:
        if f"tempmax_lag{lag}" in feature_names:
            df[f"tempmax_lag{lag}"] = g["tempmax"].shift(lag)

        if f"humidity_lag{lag}" in feature_names:
            df[f"humidity_lag{lag}"] = g["humidity"].shift(lag)

        if f"dew_lag{lag}" in feature_names:
            df[f"dew_lag{lag}"] = g["dew"].shift(lag)

        if f"solarradiation_lag{lag}" in feature_names:
            df[f"solarradiation_lag{lag}"] = g["solarradiation"].shift(lag)


    # -------- ROLLING --------
    if "temp_roll3" in feature_names:
        df["temp_roll3"] = g["tempmax"].rolling(3).mean().reset_index(level=0, drop=True)

    if "hum_roll3" in feature_names:
        df["hum_roll3"] = g["humidity"].rolling(3).mean().reset_index(level=0, drop=True)

    if "dew_roll3" in feature_names:
        df["dew_roll3"] = g["dew"].rolling(3).mean().reset_index(level=0, drop=True)

    return df.dropna()

# ------------------------------------------------
# Accuracy %
# ------------------------------------------------
def accuracy_percent(y_true, y_pred):
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    return max(0, 100 - mape)

# ------------------------------------------------
# MAIN
# ------------------------------------------------
def main():
    print("🚀 Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")

    models = {
        "tempmax": joblib.load("models/tempmax_model.pkl"),
        "humidity": joblib.load("models/humidity_model.pkl"),
        "dew": joblib.load("models/dew_model.pkl"),
        "solarradiation": joblib.load("models/solarradiation_model.pkl"),
    }

    split_date = df["datetime"].max() - pd.Timedelta(days=60)
    df_test_raw = df[df["datetime"] > split_date]

    all_acc = []

    for target, model in models.items():
        print("\n==============================")
        print(f"Evaluating model: {target}")
        print("==============================")

        required_features = model.booster_.feature_name()

        test = create_required_features(df_test_raw.copy(), required_features)

        X_test = test[required_features]
        y_test = test[target]

        preds = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        acc = accuracy_percent(y_test.values, preds)

        all_acc.append(acc)

        print(f"Feature count : {len(required_features)}")
        print(f"RMSE          : {rmse:.3f}")
        print(f"MAE           : {mae:.3f}")
        print(f"R²            : {r2:.3f}")
        print(f"Accuracy (%)  : {acc:.2f}%")

    print("\n==============================")
    print(f"OVERALL ACCURACY: {np.mean(all_acc):.2f}%")
    print("==============================")
    print("✅ Evaluation completed successfully")

if __name__ == "__main__":
    main()
