// sync.js (run once to create table)
const sequelize = require('./sequelize');
const User = require('./Models/User');

(async () => {
    try {
        await sequelize.sync({ force: true }); 
        console.log("Database synced!");
        process.exit();
    } catch (err) {
        console.error(err);
    }
})();
