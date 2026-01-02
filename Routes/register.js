const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/register - Register a new user for flood alerts
router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      address,
      alertMethods,
      locations,
      riskLevels,
      language
    } = req.body;

    // Validate required fields
    if (!phoneNumber || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!alertMethods || alertMethods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one alert method is required'
      });
    }

    if (!riskLevels || riskLevels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one risk level is required'
      });
    }

    // Check if user already exists
    const checkQuery = 'SELECT id, phone_number FROM users WHERE phone_number = $1';
    const checkResult = await pool.query(checkQuery, [phoneNumber]);

    if (checkResult.rows.length > 0) {
      // User exists, update their information
      const updateQuery = `
        UPDATE users 
        SET full_name = $1,
            email = $2,
            address = $3,
            alert_methods = $4,
            locations = $5,
            risk_levels = $6,
            language = $7,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = $8
        RETURNING *
      `;

      const values = [
        fullName || null,
        email || null,
        address || null,
        alertMethods,
        locations || [],
        riskLevels,
        language || 'en',
        phoneNumber
      ];

      const result = await pool.query(updateQuery, values);

      return res.status(200).json({
        success: true,
        message: 'Registration updated successfully',
        data: result.rows[0]
      });
    } else {
      // New user, insert
      const insertQuery = `
        INSERT INTO users (
          full_name, phone_number, email, address,
          alert_methods, locations, risk_levels, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        fullName || null,
        phoneNumber,
        email || null,
        address || null,
        alertMethods,
        locations || [],
        riskLevels,
        language || 'en'
      ];

      const result = await pool.query(insertQuery, values);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to register. Please try again later.',
      error: error.message
    });
  }
});

// GET /api/register - Get all registered users (for admin)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, full_name, phone_number, email, address,
        alert_methods, locations, risk_levels, language,
        is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registered users',
      error: error.message
    });
  }
});

// GET /api/register/:phoneNumber - Get user by phone number
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const query = `
      SELECT 
        id, full_name, phone_number, email, address,
        alert_methods, locations, risk_levels, language,
        is_active, created_at, updated_at
      FROM users
      WHERE phone_number = $1
    `;

    const result = await pool.query(query, [phoneNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// DELETE /api/register/:phoneNumber - Deactivate user
router.delete('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const query = `
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE phone_number = $1
      RETURNING *
    `;

    const result = await pool.query(query, [phoneNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
});

module.exports = router;
