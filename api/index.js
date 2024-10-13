const express = require('express');
const { initializeServices } = require('../firebase');
const { handleVideoUpload } = require('../uploadVideo');
const { handlequestions } = require('../questions');
const multer = require('multer');

const app = express();
const upload = multer({ memory: true });
const { db, storage, genAI } = initializeServices();

app.post('/api/upload-video', handleVideoUpload);

app.post('/api/questions', express.json(), handlequestions);

app.get("/api", (req, res) => {
    res.status(200).json({ message: "For Testing" });
  });

module.exports = app;