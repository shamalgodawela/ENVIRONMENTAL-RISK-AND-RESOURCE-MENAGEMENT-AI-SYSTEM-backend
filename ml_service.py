"""
FastAPI ML Service for Flood Prediction
Serves predictions from the trained Random Forest model
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="Kelani Ganga Flood Prediction ML Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
try:
    with open('flood_prediction_model.pkl', 'rb') as f:
        model_data = pickle.load(f)
    
    model = model_data['model']
    feature_cols = model_data['feature_cols']
    stations = model_data['stations']
    model_name = model_data['model_name']
    
    print(f"✓ Model loaded: {model_name}")
    print(f"✓ Features: {len(feature_cols)}")
    print(f"✓ Stations: {len(stations)}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Request/Response Models
class PredictionRequest(BaseModel):
    station: str
    water_level_previous: float
    rainfall: float = 0.0
    trend: int = 0  # 1=Rising, -1=Falling, 0=Stable
    alert_level: float
    minor_flood_level: float
    major_flood_level: float

class PredictionResponse(BaseModel):
    predicted_level: float
    status: str
    message_en: str
    message_si: str
    confidence: float

class ForecastRequest(BaseModel):
    station: str
    current_level: float
    alert_level: float
    minor_flood_level: float
    major_flood_level: float
    days: int = 7

class ForecastDay(BaseModel):
    date: str
    predicted_level: float
    status: str
    message_en: str
    message_si: str

# Motivational Messages
MESSAGES = {
    "Normal": {
        "en": "All clear! River is safe. Have a peaceful and productive day!",
        "si": "සියල්ල ආරක්ෂිතයි! ගඟ සාමාන්‍ය තත්ත්වයේ පවතී. සාමකාමී දිනයක් ගත කරන්න!"
    },
    "Alert": {
        "en": "Stay alert! Water levels rising. Keep your family prepared and informed.",
        "si": "සතුටු වන්න! ජල මට්ටම ඉහළ යමින් තිබේ. පවුලේ අය දැනුවත් කර සූදානම්ව සිටින්න."
    },
    "Minor Flood": {
        "en": "Warning: Minor flooding expected. Move valuables to higher ground. Stay safe!",
        "si": "අවවාදය: සුළු ගඟ ජලගර්භයක් බලාපොරොත්තු වේ. වටිනා දේවල් ඉහළට ගන්න. ආරක්ෂිතව සිටින්න!"
    },
    "Major Flood": {
        "en": "DANGER: Major flood imminent! Evacuate immediately if instructed by authorities!",
        "si": "අනතුරු! මහා ගඟ ජලගර්භයක් එන බවට බලාපොරොත්තු වේ! බලධාරීන්ගේ උපදෙස් මත වහාම ඉවත් වන්න!"
    }
}

def determine_status(level: float, alert: float, minor: float, major: float) -> str:
    """Determine flood status based on water level"""
    if level >= major:
        return "Major Flood"
    elif level >= minor:
        return "Minor Flood"
    elif level >= alert:
        return "Alert"
    return "Normal"

def create_input_features(station: str, water_level: float, rainfall: float, 
                         trend: int, date: datetime = None) -> pd.DataFrame:
    """Create feature vector for prediction"""
    if date is None:
        date = datetime.now()
    
    input_data = {
        'Water Level Previous': water_level,
        'Rainfall (mm)': rainfall,
        'Trend_Encoded': trend,
        'Month': date.month,
        'Day': date.day,
        'Hour': date.hour
    }
    
    # Add station one-hot encoding
    for s in stations:
        input_data[f'Station_{s}'] = 1 if s == station else 0
    
    return pd.DataFrame([input_data])[feature_cols]

@app.get("/")
def read_root():
    return {
        "service": "Kelani Ganga Flood Prediction ML Service",
        "model": model_name if model else "Not loaded",
        "stations": stations if model else [],
        "status": "operational" if model else "error"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy" if model else "unhealthy",
        "model_loaded": model is not None
    }

@app.get("/stations")
def get_stations():
    """Get list of available stations"""
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    return {"stations": stations}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """Make a single prediction"""
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    if request.station not in stations:
        raise HTTPException(status_code=400, detail=f"Invalid station. Choose from: {stations}")
    
    try:
        # Create features
        X = create_input_features(
            request.station,
            request.water_level_previous,
            request.rainfall,
            request.trend
        )
        
        # Predict
        predicted_level = float(model.predict(X)[0])
        
        # Determine status
        status = determine_status(
            predicted_level,
            request.alert_level,
            request.minor_flood_level,
            request.major_flood_level
        )
        
        # Get messages
        messages = MESSAGES[status]
        
        # Calculate confidence (simplified)
        confidence = 0.95 if status in ["Normal", "Alert"] else 0.88
        
        return PredictionResponse(
            predicted_level=round(predicted_level, 3),
            status=status,
            message_en=messages["en"],
            message_si=messages["si"],
            confidence=confidence
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/forecast", response_model=List[ForecastDay])
def forecast(request: ForecastRequest):
    """Generate multi-day forecast"""
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    if request.station not in stations:
        raise HTTPException(status_code=400, detail=f"Invalid station. Choose from: {stations}")
    
    try:
        forecasts = []
        current_level = request.current_level
        base_date = datetime.now()
        
        for day in range(1, request.days + 1):
            future_date = base_date + timedelta(days=day)
            
            # Create features
            X = create_input_features(
                request.station,
                current_level,
                0.0,  # Assume no rainfall
                0,    # Stable trend
                future_date
            )
            
            # Predict
            predicted_level = float(model.predict(X)[0])
            
            # Determine status
            status = determine_status(
                predicted_level,
                request.alert_level,
                request.minor_flood_level,
                request.major_flood_level
            )
            
            # Get messages
            messages = MESSAGES[status]
            
            forecasts.append(ForecastDay(
                date=future_date.strftime('%Y-%m-%d'),
                predicted_level=round(predicted_level, 3),
                status=status,
                message_en=messages["en"],
                message_si=messages["si"]
            ))
            
            # Update current level for next iteration (autoregressive)
            current_level = predicted_level
        
        return forecasts
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
