const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all stations
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM stations ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single station by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM stations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching station:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get station by name
router.get('/name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await db.query(
      'SELECT * FROM stations WHERE name ILIKE $1',
      [name]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching station:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update station
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, alert_level, minor_flood_level, major_flood_level } = req.body;
    
    const result = await db.query(
      `UPDATE stations 
       SET name = COALESCE($1, name),
           latitude = COALESCE($2, latitude),
           longitude = COALESCE($3, longitude),
           alert_level = COALESCE($4, alert_level),
           minor_flood_level = COALESCE($5, minor_flood_level),
           major_flood_level = COALESCE($6, major_flood_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, latitude, longitude, alert_level, minor_flood_level, major_flood_level, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating station:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
