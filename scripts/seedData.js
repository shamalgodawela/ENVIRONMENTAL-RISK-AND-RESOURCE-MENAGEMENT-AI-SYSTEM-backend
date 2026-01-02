const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function seedData() {
  try {
    console.log('Starting data seeding...\n');
    
    // Get all stations
    const stationsResult = await db.query('SELECT id, name FROM stations ORDER BY name');
    const stations = {};
    stationsResult.rows.forEach(s => {
      stations[s.name] = s.id;
    });
    
    console.log(`Found ${stationsResult.rows.length} stations`);
    
    // Load CSV data
    const csvPath = path.join(__dirname, '../river_flood/cleaned_river_water.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('Warning: cleaned_river_water.csv not found. Run the notebook first.');
      process.exit(0);
    }
    
    const waterLevelData = [];
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        waterLevelData.push(row);
      })
      .on('end', async () => {
        console.log(`\nLoaded ${waterLevelData.length} rows from CSV`);
        
        let inserted = 0;
        for (const row of waterLevelData) {
          const stationId = stations[row.Station];
          
          if (stationId) {
            try {
              await db.query(
                `INSERT INTO water_levels (station_id, datetime, water_level, rainfall, trend, status, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT DO NOTHING`,
                [
                  stationId,
                  row.Datetime,
                  parseFloat(row['Water Level Current']) || 0,
                  parseFloat(row['Rainfall (mm)']) || 0,
                  row['Water Level Trend'] || 'Stable',
                  row.Remarks || 'Normal',
                  row.Remarks || ''
                ]
              );
              inserted++;
            } catch (err) {
              // Skip duplicates
            }
          }
        }
        
        console.log(`✓ Inserted ${inserted} water level records`);
        console.log('\n✓ Data seeding complete!');
        process.exit(0);
      });
    
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedData();
