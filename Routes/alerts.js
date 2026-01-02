const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all active alerts
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM active_alerts ORDER BY issued_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get alerts by station
router.get('/station/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const result = await db.query(
      `SELECT a.*, s.name as station_name
       FROM alerts a
       JOIN stations s ON a.station_id = s.id
       WHERE a.station_id = $1
       AND a.is_active = TRUE
       AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
       ORDER BY a.issued_at DESC`,
      [stationId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const { station_id, alert_type, severity, message_en, message_si, expires_at } = req.body;
    
    if (!station_id || !alert_type || !severity || !message_en || !message_si) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const result = await db.query(
      `INSERT INTO alerts (station_id, alert_type, severity, message_en, message_si, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [station_id, alert_type, severity, message_en, message_si, expires_at]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Deactivate alert
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `UPDATE alerts
       SET is_active = FALSE
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error deactivating alert:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Error deleting alert:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
