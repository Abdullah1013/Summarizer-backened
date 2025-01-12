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

// CORS configuration (adjust as necessary)
app.use(cors({
  origin: '*', // Allow all origins for testing, replace with your frontend URL in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Routes
app.use('/api', uploadRoute);

// Test route to check if the server is working
app.get('/test', (req, res) => {
  res.status(200).send('Server is up and running on Vercel!');
});

// Database connection
connectDB();

// Export the app for Vercel
module.exports = app;
