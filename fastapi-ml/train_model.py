import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
from lightgbm import LGBMRegressor
import joblib
import os
from lightgbm import early_stopping

# ===============================
# PATHS
# ===============================
DATA_PATH = "data/train-all 13 division 2016-2025 weather data (location,date,tempmax,humidity,dew,solarradiation).csv"
MODEL_DIR = "models/"

os.makedirs(MODEL_DIR, exist_ok=True)

# ===============================
# MAIN FUNCTION
# ===============================
def main():

    print("🚀 Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    # ===============================
    # DATETIME
    # ===============================
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df = df.sort_values(["location", "datetime"]).reset_index(drop=True)

    # ===============================
    # LOCATION ENCODING
    # ===============================
    le = LabelEncoder()
    df["location_enc"] = le.fit_transform(df["location"])

    # ===============================
    # TIME FEATURES
    # ===============================
    df["month"] = df["datetime"].dt.month
    df["dayofyear"] = df["datetime"].dt.dayofyear

    # ===============================
    # LAG FEATURES
    # ===============================
    for col in ["tempmax", "humidity", "dew", "solarradiation"]:
        df[f"{col}_lag1"] = df.groupby("location")[col].shift(1)
        df[f"{col}_lag7"] = df.groupby("location")[col].shift(7)
        df[f"{col}_lag14"] = df.groupby("location")[col].shift(14)

    # ===============================
    # ROLLING FEATURES (FAST)
    # ===============================
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

    # ===============================
    # DROP NA
    # ===============================
    df = df.dropna()

    # ===============================
    # TRAIN / TEST SPLIT (LAST 60 DAYS)
    # ===============================
    split_date = df["datetime"].max() - pd.Timedelta(days=60)
    train = df[df["datetime"] <= split_date]
    test  = df[df["datetime"] > split_date]

    # ===============================
    # TARGET-WISE FEATURES
    # ===============================
    target_columns = {

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

    # ===============================
    # TRAIN MODELS
    # ===============================
    for target, features in target_columns.items():

        print("\n==============================")
        print(f"Training model for: {target}")
        print("==============================")

        X_train = train[features]
        y_train = train[target]
        X_test  = test[features]
        y_test  = test[target]

        model = LGBMRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )

        model.fit(
        X_train, y_train,
            eval_set=[(X_test, y_test)],
            eval_metric="rmse",
            callbacks=[early_stopping(stopping_rounds=30)],
        ) 

        preds = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae  = mean_absolute_error(y_test, preds)
        r2   = r2_score(y_test, preds)

        print(f"RMSE: {rmse:.3f}")
        print(f"MAE : {mae:.3f}")
        print(f"R2  : {r2:.3f}")

        model_path = f"{MODEL_DIR}{target}_model.pkl"
        joblib.dump(model, model_path)

        print(f"✅ Model saved: {model_path}")

    print("\n🎉 Training completed successfully!")


# ===============================
# RUN
# ===============================
if __name__ == "__main__":
    main()
