const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');

const OPENWEATHER_API_KEY = '5e3d9829448f78a08a552179d0a07691';
const COLOMBO_LAT = 6.9271;
const COLOMBO_LON = 79.8612;

// Fetch current weather from OpenWeather API
async function fetchWeatherData() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${COLOMBO_LAT}&lon=${COLOMBO_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    throw error;
  }
}

// Store weather data in database
async function storeWeatherData(weatherData) {
  const query = `
    INSERT INTO weather_data (
      location, latitude, longitude, temperature, feels_like,
      humidity, pressure, wind_speed, wind_direction, cloudiness,
      rainfall_1h, rainfall_3h, weather_main, weather_description, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const values = [
    'Kelani Ganga Basin',
    weatherData.coord.lat,
    weatherData.coord.lon,
    weatherData.main.temp,
    weatherData.main.feels_like,
    weatherData.main.humidity,
    weatherData.main.pressure,
    weatherData.wind.speed,
    weatherData.wind.deg,
    weatherData.clouds.all,
    weatherData.rain?.['1h'] || 0,
    weatherData.rain?.['3h'] || 0,
    weatherData.weather[0].main,
    weatherData.weather[0].description,
    new Date(weatherData.dt * 1000)
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// GET /api/weather/current - Fetch and store current weather
router.get('/current', async (req, res) => {
  try {
    const weatherData = await fetchWeatherData();
    const storedData = await storeWeatherData(weatherData);
    
    res.json({
      success: true,
      data: storedData
    });
  } catch (error) {
    console.error('Error in /current:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data'
    });
  }
});

// GET /api/weather/latest - Get latest weather data from database
router.get('/latest', async (req, res) => {
  try {
    const query = `
      SELECT * FROM weather_data
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error in /latest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest weather data'
    });
  }
});

// GET /api/weather/daily - Get daily weather summary
router.get('/daily', async (req, res) => {
  try {
    const query = `
      SELECT 
        DATE(recorded_at) as date,
        AVG(temperature) as avg_temp,
        MAX(temperature) as max_temp,
        MIN(temperature) as min_temp,
        AVG(humidity) as avg_humidity,
        SUM(rainfall_1h) as total_rainfall,
        AVG(wind_speed) as avg_wind_speed,
        array_agg(DISTINCT weather_main) as weather_conditions
      FROM weather_data
      WHERE recorded_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error in /daily:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily weather data'
    });
  }
});

// GET /api/weather/history - Get weather history with pagination
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 24;
    const offset = parseInt(req.query.offset) || 0;
    
    const query = `
      SELECT * FROM weather_data
      ORDER BY recorded_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit,
        offset,
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error in /history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather history'
    });
  }
});

module.exports = router;
