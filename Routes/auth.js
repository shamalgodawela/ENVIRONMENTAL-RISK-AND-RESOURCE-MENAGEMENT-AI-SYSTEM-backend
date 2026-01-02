const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Simple password hashing (in production, use bcrypt)
const hashPassword = (password) => {
  // This is a simple hash - in production use bcrypt
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
};

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Validate required fields
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required'
      });
    }

    // Check if user exists
    const query = `
      SELECT 
        id, full_name, phone_number, email, address,
        alert_methods, locations, risk_levels, language,
        password_hash, is_active, created_at
      FROM users
      WHERE phone_number = $1 AND is_active = TRUE
    `;

    const result = await pool.query(query, [phoneNumber]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    const user = result.rows[0];

    // Check password
    const hashedPassword = hashPassword(password);
    
    if (user.password_hash && user.password_hash !== hashedPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // If user has no password set, this is their first login
    // Set the password for them
    if (!user.password_hash) {
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await pool.query(updateQuery, [hashedPassword, user.id]);
    }

    // Remove password from response
    delete user.password_hash;

    // Update last login (you might want to add this column)
    const updateLoginQuery = `
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await pool.query(updateLoginQuery, [user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      user: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.',
      error: error.message
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  // Since we're using localStorage, logout is handled client-side
  // This endpoint can be used for logging purposes
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/verify - Verify if user is logged in
router.get('/verify', async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const query = `
      SELECT 
        id, full_name, phone_number, email, address,
        alert_methods, locations, risk_levels, language,
        is_active, created_at
      FROM users
      WHERE phone_number = $1 AND is_active = TRUE
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
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});

module.exports = router;
