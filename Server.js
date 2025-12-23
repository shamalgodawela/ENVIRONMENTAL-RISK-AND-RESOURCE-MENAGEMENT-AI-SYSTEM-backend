// app.js
const express = require('express');
const bodyParser = require('body-parser');
const CoralauthRoutes = require('./Routes/CoralUserRoute');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.use('/api/CoralauthRoutes', CoralauthRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
