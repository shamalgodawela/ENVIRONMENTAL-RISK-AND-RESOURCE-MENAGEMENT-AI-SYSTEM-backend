import pandas as pd
import requests
from datetime import datetime, timedelta

from config.settings import (
    CSV_PATH,
    LOCATIONS,
    BASE_URL,
    VISUAL_CROSSING_API_KEY
)


# -------------------------------------------------
# Get missing dates between last CSV date and today
# -------------------------------------------------
def get_missing_dates(last_date, today):
    start = last_date + timedelta(days=1)
    end = today - timedelta(days=1)
    if start > end:
        return pd.DatetimeIndex([])  # return empty DatetimeIndex
    return pd.date_range(start, end)  # returns DatetimeIndex


# -------------------------------------------------
# Fetch weather using LAT,LON but store LOCATION NAME
# -------------------------------------------------
def fetch_weather(location, coords, date):
    lat, lon = coords
    location_query = f"{lat},{lon}"

    # 🔥 FIX: convert to YYYY-MM-DD
    date_str = date.strftime("%Y-%m-%d")

    url = f"{BASE_URL}/{location_query}/{date_str}/{date_str}"
    params = {
        "unitGroup": "metric",
        "include": "days",
        "key": VISUAL_CROSSING_API_KEY,
        "contentType": "json"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()

    # 🛡️ Safety check (API sometimes returns empty days)
    if "days" not in data or not data["days"]:
        raise ValueError("No weather data returned")

    day = data["days"][0]

    return {
        "location": location,  # ✅ store name, not coordinates
        "datetime": date_str,
        "tempmax": day.get("tempmax"),
        "dew": day.get("dew"),
        "humidity": day.get("humidity"),
        "solarradiation": day.get("solarradiation")
    }



# -------------------------------------------------
# Update CSV automatically on app startup
# -------------------------------------------------
def update_weather_csv():
    print("🔄 Checking weather CSV updates...")

    df = pd.read_csv(CSV_PATH)

    df["datetime"] = pd.to_datetime(
        df["datetime"],
        format="mixed",
        dayfirst=True,
        errors="coerce"
    )

    df = df.dropna(subset=["datetime"])

    last_date = df["datetime"].max().date()
    today = datetime.now().date()

    missing_dates = get_missing_dates(last_date, today)

    if missing_dates.empty:
        print("✅ CSV already up to date")
        return

    new_rows = []

    for date in missing_dates:
        print(f"🌦️ Fetching weather for {date}")
        for location, coords in LOCATIONS.items():
            try:
                row = fetch_weather(location, coords, date)
                new_rows.append(row)
            except Exception as e:
                print(f"❌ Failed {location} {date}: {e}")

    if new_rows:
        new_df = pd.DataFrame(new_rows)

        df = pd.concat([df, new_df], ignore_index=True)
        df.sort_values(["location", "datetime"], inplace=True)
        df.to_csv(CSV_PATH, index=False)

        print(f"✅ Added {len(new_rows)} new rows to CSV")
