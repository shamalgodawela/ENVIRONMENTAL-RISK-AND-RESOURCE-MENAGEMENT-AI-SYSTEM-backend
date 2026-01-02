from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import pandas as pd

from utils.prediction_logic import load_models, run_predictions
from services.weather_updater import update_weather_csv
from config.settings import CSV_PATH

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# -----------------------------
# Startup event
# -----------------------------
@app.on_event("startup")
def startup_tasks():
    print("🚀 FastAPI starting...")

    # 1️⃣ Update CSV using Weather API
    update_weather_csv()

    # 2️⃣ Load updated dataset
    global df
    df = pd.read_csv(CSV_PATH)

    # 3️⃣ Load ML models
    global models
    models = load_models()

    print("✅ Startup tasks completed")


# -----------------------------
# Root check
# -----------------------------
@app.get("/")
def root():
    return {"status": "FastAPI ML service running!"}

@app.get("/predict")
def predict_json():
    predictions = run_predictions(df, models)
    return predictions

@app.get("/predict")
def predict_api():
    predictions = run_predictions(df, models)
    return predictions    


# -----------------------------
# Prediction UI
# -----------------------------
@app.get("/predict/ui", response_class=HTMLResponse)
def predict_ui(request: Request):
    predictions = run_predictions(df, models)

    return templates.TemplateResponse(
        "predictions.html",
        {
            "request": request,
            "predictions": predictions
        }
    )
