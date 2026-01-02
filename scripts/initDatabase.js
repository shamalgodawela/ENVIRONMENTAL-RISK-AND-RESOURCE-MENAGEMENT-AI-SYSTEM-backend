const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Creating database...');
    
    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'flood_prediction']
    );
    
    if (dbCheck.rows.length === 0) {
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'flood_prediction'}`);
      console.log('✓ Database created successfully');
    } else {
      console.log('✓ Database already exists');
    }
    
    client.release();
    
    // Connect to the new database
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'flood_prediction',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
    });
    
    const dbClient = await dbPool.connect();
    
    console.log('Running schema...');
    const schema = fs.readFileSync(path.join(__dirname, '../database.sql'), 'utf8');
    await dbClient.query(schema);
    console.log('✓ Schema created successfully');
    
    dbClient.release();
    await dbPool.end();
    
    console.log('\n✓ Database initialization complete!');
    process.exit(0);
    
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initDatabase();
