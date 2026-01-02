const cron = require('node-cron');
const axios = require('axios');

// Fetch weather data from local API endpoint
async function updateWeatherData() {
  try {
    console.log('[Weather Scheduler] Fetching weather data...');
    const response = await axios.get('http://localhost:5000/api/weather/current');
    
    if (response.data.success) {
      console.log('[Weather Scheduler] Weather data updated successfully');
      console.log(`Temperature: ${response.data.data.temperature}°C`);
      console.log(`Humidity: ${response.data.data.humidity}%`);
      console.log(`Rainfall (1h): ${response.data.data.rainfall_1h || 0} mm`);
    } else {
      console.error('[Weather Scheduler] Failed to update weather data');
    }
  } catch (error) {
    console.error('[Weather Scheduler] Error updating weather data:', error.message);
  }
}

// Initialize weather scheduler
function initWeatherScheduler() {
  // Fetch weather data immediately on startup
  console.log('[Weather Scheduler] Starting weather data scheduler...');
  updateWeatherData();

  // Schedule weather data fetch every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Weather Scheduler] Running scheduled weather update');
    updateWeatherData();
  });

  // Also schedule a daily update at 6 AM
  cron.schedule('0 6 * * *', () => {
    console.log('[Weather Scheduler] Running daily morning weather update');
    updateWeatherData();
  });

  console.log('[Weather Scheduler] Scheduler initialized');
  console.log('[Weather Scheduler] Hourly updates: Every hour at minute 0');
  console.log('[Weather Scheduler] Daily update: 6:00 AM');
}

module.exports = { initWeatherScheduler, updateWeatherData };
