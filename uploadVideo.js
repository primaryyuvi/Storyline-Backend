
// Assuming you've already initialized Firebase and Gemini in a separate file
const { initializeServices } = require('./firebase');
const axios = require('axios');

const { db, storage,genAI } = initializeServices();

async function handleVideoUpload(req, res) {
  try {
    const { url,videoId } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'Video URL is required' });
    }

    
    if (!genAI) {
      console.error('Gemini AI is not initialized');
      return res.status(500).json({ success: false, error: 'AI service is not available' });
    }

    console.log(url);
    const response = await axios.get(url, { responseType: 'blob' });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "video/mp4",
          data: Buffer.from(response.data).toString('base64')
        }
      }
    ]);
    const videoAnalysis = await result.response.text();
    const docRef = await db.collection('videos').document(videoId).update({ analysis: videoAnalysis });
    console.log(videoAnalysis)
    console.log('Video uploaded successfully:', docRef.id);
    res.json({ success: true, videoId: docRef.id });
  } catch (error) {
    console.error('Error in video upload handler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { handleVideoUpload };