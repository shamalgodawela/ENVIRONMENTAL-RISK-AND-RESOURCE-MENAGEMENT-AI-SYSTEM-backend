const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get latest water levels for all stations
router.get('/latest', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM latest_water_levels ORDER BY station_name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching latest water levels:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get water levels by station ID
router.get('/station/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { limit = 100, offset = 0, startDate, endDate } = req.query;
    
    let query = `
      SELECT wl.*, s.name as station_name
      FROM water_levels wl
      JOIN stations s ON wl.station_id = s.id
      WHERE wl.station_id = $1
    `;
    const params = [stationId];
    let paramCount = 1;
    
    if (startDate) {
      paramCount++;
      query += ` AND wl.datetime >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND wl.datetime <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY wl.datetime DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Error fetching water levels:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new water level reading
router.post('/', async (req, res) => {
  try {
    const { station_id, datetime, water_level, rainfall, trend, status, remarks } = req.body;
    
    if (!station_id || !datetime || water_level === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: station_id, datetime, water_level' 
      });
    }
    
    const result = await db.query(
      `INSERT INTO water_levels (station_id, datetime, water_level, rainfall, trend, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [station_id, datetime, water_level, rainfall || 0, trend, status, remarks]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error adding water level:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get historical data for charts
router.get('/history/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { days = 7 } = req.query;
    
    const result = await db.query(
      `SELECT 
        datetime,
        water_level,
        rainfall,
        status,
        trend
       FROM water_levels
       WHERE station_id = $1
       AND datetime >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY datetime ASC`,
      [stationId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
