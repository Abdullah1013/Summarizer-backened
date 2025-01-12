const express = require('express');
const fs = require('fs');
const { connectDB } = require("./config/db");
const uploadRoute = require('./routes/fileUploadroute');
const cors = require('cors');

const app = express();


// Create the "uploads" folder if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Middleware
app.use(express.json());

// Routes
app.use('/api', uploadRoute);

// Database connection
connectDB();

// Export the app for Vercel
module.exports = app;
