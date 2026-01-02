-- Kelani Ganga Flood Prediction Database Schema
-- PostgreSQL Database Setup

-- Drop existing views if they exist
DROP VIEW IF EXISTS active_alerts CASCADE;
DROP VIEW IF EXISTS latest_water_levels CASCADE;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS water_levels CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Stations Table
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    alert_level DECIMAL(10, 4) NOT NULL,
    minor_flood_level DECIMAL(10, 4) NOT NULL,
    major_flood_level DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(10) DEFAULT 'm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Water Levels Table (Historical Data)
CREATE TABLE water_levels (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    datetime TIMESTAMP NOT NULL,
    water_level DECIMAL(10, 4) NOT NULL,
    rainfall DECIMAL(10, 2) DEFAULT 0.0,
    trend VARCHAR(20), -- Rising, Falling, Stable
    status VARCHAR(50), -- Normal, Alert, Minor Flood, Major Flood
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictions Table
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    predicted_level DECIMAL(10, 4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    confidence DECIMAL(5, 4),
    message_en TEXT,
    message_si TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- Alert, Minor Flood, Major Flood
    severity VARCHAR(20) NOT NULL, -- Low, Medium, High, Critical
    message_en TEXT NOT NULL,
    message_si TEXT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Data Table (OpenWeather API Data)
CREATE TABLE weather_data (
    id SERIAL PRIMARY KEY,
    location VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    temperature DECIMAL(5, 2),
    feels_like DECIMAL(5, 2),
    humidity INTEGER,
    pressure INTEGER,
    wind_speed DECIMAL(5, 2),
    wind_direction INTEGER,
    cloudiness INTEGER,
    rainfall_1h DECIMAL(10, 2) DEFAULT 0.0,
    rainfall_3h DECIMAL(10, 2) DEFAULT 0.0,
    weather_main VARCHAR(50),
    weather_description TEXT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Registration for Flood Alerts)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    address TEXT,
    alert_methods TEXT[], -- Array of alert methods (SMS, WhatsApp, Email, Push)
    locations TEXT[], -- Array of location codes
    risk_levels TEXT[], -- Array of risk levels (Critical, High, Medium, Low)
    language VARCHAR(10) DEFAULT 'en',
    password_hash VARCHAR(255), -- SHA256 hash of password
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample stations (Kelani Ganga River)
INSERT INTO stations (name, latitude, longitude, alert_level, minor_flood_level, major_flood_level) VALUES
('Glencourse', 6.9667, 80.2033, 2.5, 3.0, 3.5),
('Kitulgala', 6.9833, 80.4167, 3.0, 4.0, 5.0),
('Deraniyagala', 6.9333, 80.3500, 2.8, 3.5, 4.2),
('Hanwella', 6.9083, 80.0833, 2.0, 2.5, 3.0),
('Nagalagam Street', 6.9333, 79.8667, 1.5, 2.0, 2.5),
('Colombo', 6.9271, 79.8612, 1.0, 1.5, 2.0),
('Norwood', 6.8333, 80.6167, 3.5, 4.5, 5.5),
('Wakoya', 7.0167, 80.3500, 2.7, 3.3, 4.0);

-- Create indexes for better query performance
CREATE INDEX idx_water_levels_station ON water_levels(station_id);
CREATE INDEX idx_water_levels_datetime ON water_levels(datetime);
CREATE INDEX idx_predictions_station_date ON predictions(station_id, prediction_date);
CREATE INDEX idx_alerts_station_active ON alerts(station_id, is_active);
CREATE INDEX idx_weather_data_location ON weather_data(location);
CREATE INDEX idx_weather_data_recorded_at ON weather_data(recorded_at);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';


-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Create trigger for stations table
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for latest water levels
CREATE VIEW latest_water_levels AS
SELECT DISTINCT ON (wl.station_id)
    s.id as station_id,
    s.name as station_name,
    wl.datetime,
    wl.water_level,
    wl.rainfall,
    wl.trend,
    wl.status,
    s.alert_level,
    s.minor_flood_level,
    s.major_flood_level
FROM water_levels wl
JOIN stations s ON wl.station_id = s.id
ORDER BY wl.station_id, wl.datetime DESC;

-- Create view for active alerts
CREATE VIEW active_alerts AS
SELECT 
    a.id,
    s.name as station_name,
    a.alert_type,
    a.severity,
    a.message_en,
    a.message_si,
    a.issued_at,
    a.expires_at
FROM alerts a
JOIN stations s ON a.station_id = s.id
WHERE a.is_active = TRUE
AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
ORDER BY a.issued_at DESC;

COMMENT ON TABLE stations IS 'River monitoring stations along Kelani Ganga';
COMMENT ON TABLE water_levels IS 'Historical water level measurements';
COMMENT ON TABLE predictions IS 'ML model predictions for future water levels';
COMMENT ON TABLE alerts IS 'Flood alert notifications';
