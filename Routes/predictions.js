const express = require('express');
const router = express.Router();
const db = require('../config/database');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Get prediction for a station
router.post('/predict', async (req, res) => {
  try {
    const { station, water_level_previous, rainfall, trend, alert_level, minor_flood_level, major_flood_level } = req.body;
    
    // Call ML service
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      station,
      water_level_previous,
      rainfall: rainfall || 0,
      trend: trend || 0,
      alert_level,
      minor_flood_level,
      major_flood_level
    });
    
    const prediction = mlResponse.data;
    
    // Get station ID
    const stationResult = await db.query('SELECT id FROM stations WHERE name ILIKE $1', [station]);
    
    if (stationResult.rows.length > 0) {
      const stationId = stationResult.rows[0].id;
      
      // Save prediction to database
      await db.query(
        `INSERT INTO predictions (station_id, prediction_date, predicted_level, status, confidence, message_en, message_si)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)`,
        [stationId, prediction.predicted_level, prediction.status, prediction.confidence, prediction.message_en, prediction.message_si]
      );
    }
    
    res.json({ success: true, data: prediction });
  } catch (err) {
    console.error('Error making prediction:', err);
    res.status(500).json({ 
      success: false, 
      error: err.response?.data?.detail || err.message 
    });
  }
});

// Get 7-day forecast
router.post('/forecast', async (req, res) => {
  try {
    const { station, current_level, alert_level, minor_flood_level, major_flood_level, days } = req.body;
    
    // Call ML service
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/forecast`, {
      station,
      current_level,
      alert_level,
      minor_flood_level,
      major_flood_level,
      days: days || 7
    });
    
    const forecast = mlResponse.data;
    
    // Get station ID
    const stationResult = await db.query('SELECT id FROM stations WHERE name ILIKE $1', [station]);
    
    if (stationResult.rows.length > 0) {
      const stationId = stationResult.rows[0].id;
      
      // Save predictions to database
      for (const day of forecast) {
        await db.query(
          `INSERT INTO predictions (station_id, prediction_date, predicted_level, status, message_en, message_si)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [stationId, day.date, day.predicted_level, day.status, day.message_en, day.message_si]
        );
      }
    }
    
    res.json({ success: true, data: forecast });
  } catch (err) {
    console.error('Error making forecast:', err);
    res.status(500).json({ 
      success: false, 
      error: err.response?.data?.detail || err.message 
    });
  }
});

// Get forecasts for all stations
router.get('/forecasts', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const result = await db.query(
      `SELECT 
        p.*,
        s.name as station_name
       FROM predictions p
       JOIN stations s ON p.station_id = s.id
       WHERE p.prediction_date >= CURRENT_DATE
       AND p.prediction_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
       ORDER BY s.name, p.prediction_date`,
      []
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching forecasts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get forecast by station
router.get('/forecast/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { days = 7 } = req.query;
    
    const result = await db.query(
      `SELECT *
       FROM predictions
       WHERE station_id = $1
       AND prediction_date >= CURRENT_DATE
       AND prediction_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
       ORDER BY prediction_date`,
      [stationId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching forecast:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get ML-generated 7-day forecast from CSV
router.get('/ml-forecast', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '..', 'river_flood', '7_Day_Flood_Forecast_With_Messages.csv');
    const results = [];
    
    createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        res.json({ success: true, data: results });
      })
      .on('error', (err) => {
        console.error('Error reading forecast CSV:', err);
        res.status(500).json({ success: false, error: 'Failed to read forecast data' });
      });
  } catch (err) {
    console.error('Error fetching ML forecast:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get station-specific CSV data
router.get('/station-data/:stationName', async (req, res) => {
  try {
    const { stationName } = req.params;
    
    if (!stationName || stationName === 'undefined') {
      return res.status(400).json({ success: false, error: 'Station name is required' });
    }
    
    const cleanName = stationName.replace(/ /g, '_');
    const csvPath = path.join(__dirname, '..', 'river_flood', `${cleanName}.csv`);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, error: `No data found for station: ${stationName}` });
    }
    
    const results = [];
    
    createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        res.json({ success: true, data: results });
      })
      .on('error', (err) => {
        console.error('Error reading station CSV:', err);
        res.status(404).json({ success: false, error: 'Station data not found' });
      });
  } catch (err) {
    console.error('Error fetching station data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;