const express = require('express');
const { uploadMiddleware, uploadFile } = require('../controllers/fileUpload');
const { chatbotResponse } = require('../controllers/fileUpload');
const router = express.Router();

// POST route for file upload
router.post('/upload', uploadMiddleware, uploadFile);
router.post('/chatbot', chatbotResponse);

module.exports = router;
