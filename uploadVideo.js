
// Assuming you've already initialized Firebase and Gemini in a separate file
const { initializeServices } = require('./firebase');

const { db, storage,genAI } = initializeServices();

async function handleVideoUpload(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'Video URL is required' });
    }

    
    if (!genAI) {
      console.error('Gemini AI is not initialized');
      return res.status(500).json({ success: false, error: 'AI service is not available' });
    }

    console.log(url);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const result = await model.generateContent([url]);
    const videoAnalysis = await result.response.text();
    const docRef = await db.collection('videos').add({
      analysis: videoAnalysis,
    });
    console.log(videoAnalysis)
    console.log('Video uploaded successfully:', docRef.id);
    res.json({ success: true, videoId: docRef.id });
  } catch (error) {
    console.error('Error in video upload handler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { handleVideoUpload };