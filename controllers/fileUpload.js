require('dotenv').config();
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { Document } = require('../models/doument');

const HUGGING_FACE_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;  // Use the token from .env file

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const chunkText = (text, maxTokens = 200) => {
  const sentences = text.split('. ');
  const chunks = [];
  let currentChunk = '';

  sentences.forEach((sentence) => {
    if ((currentChunk + sentence).split(' ').length <= maxTokens) {
      currentChunk += sentence + '. ';
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + '. ';
    }
  });

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};

const analyzeEmotions = async (text) => {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base",
      { inputs: text },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error analyzing emotions:", error.message);
    return [];
  }
};

const aggregateEmotions = (emotionResults) => {
  const emotionMap = {};

  emotionResults.forEach((result) => {
    result.forEach(({ label, score }) => {
      if (!emotionMap[label]) emotionMap[label] = { totalScore: 0, count: 0 };
      emotionMap[label].totalScore += score;
      emotionMap[label].count++;
    });
  });

  return Object.entries(emotionMap).map(([label, { totalScore, count }]) => ({
    label,
    score: totalScore / count,
  }));
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const filePath = path.resolve('./uploads', req.file.filename);
    const fileContent = path.extname(req.file.originalname) === '.docx'
      ? (await mammoth.extractRawText({ path: filePath })).value
      : fs.readFileSync(filePath, 'utf-8');

    const chunks = chunkText(fileContent, 200);
    const summarizedChunks = await Promise.all(chunks.map(async (chunk) => {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        { inputs: chunk },
        { headers: { Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}` } }
      );
      return response.data?.[0]?.summary_text || '';
    }));

    const emotionResults = await Promise.all(chunks.map(analyzeEmotions));
    const aggregatedEmotions = aggregateEmotions(emotionResults.flat());
    const finalSummary = summarizedChunks.join(' ');

    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete file: ${filePath}`, err);
    });

    const document = await Document.create({
      filename: req.file.originalname,
      content: fileContent,
      summary: finalSummary,
    });

    res.status(200).json({
      message: 'File processed successfully',
      document,
      summary: finalSummary,
      emotions: aggregatedEmotions,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: 'Error processing the file', error: error.message });
  }
};

const chatbotResponse = async (req, res) => {
  const { message, summary, conversationHistory } = req.body;

  try {
    if (!message || !summary) {
      return res.status(400).json({ error: "Message and summary are required." });
    }

    // Combine the summary and message into one prompt to send to the model
    const inputText = `
      The following is a summary of a previous conversation:
      Summary: ${summary}
      User's question: "${message}"
      Chatbot response:`;

    // Use Hugging Face API to get a response from Falcon-7B model
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct',
      {
        inputs: inputText,
        parameters: {
          max_new_tokens: 150,  // You can adjust the length of the response
          temperature: 0.7,      // You can adjust the creativity of the response
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}`, // Replace with your Hugging Face token
        },
      }
    );

    // Extract the response from the model output
    const botResponse =
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0 &&
      response.data[0].generated_text
        ? response.data[0].generated_text.trim()
        : "Sorry, I couldn't generate a response. Please try again.";

    // Remove the extra context from the bot's response
    const cleanedBotResponse = botResponse.split('Chatbot response:')[1]?.trim() || botResponse;

    // Update conversation history
    const updatedConversation = [
      ...conversationHistory,
      { user: message, bot: cleanedBotResponse },
    ];

    res.status(200).json({
      response: cleanedBotResponse, // Send only the final response to the frontend
      conversationHistory: updatedConversation,
    });
  } catch (error) {
    console.error("Error in chatbot:", error.response?.data || error.message);
    res.status(500).json({
      response: "An error occurred while generating the response.",
      error: error.response?.data || error.message,
    });
  }
};



module.exports = {
  uploadMiddleware: upload.single('file'),
  uploadFile,
  chatbotResponse,
};
