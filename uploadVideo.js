
const { initializeServices } = require('./firebase');
const axios = require('axios');
const { db, storage, genAI } = initializeServices();

async function fetchVideoAsBase64(videoUrl) {
  try {
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer'
    });
    console.log(response.data);

    const base64Data = Buffer.from(response.data).toString('base64');
    console.log(`Fetched video as base64: ${videoUrl}`);
    return base64Data;
  } catch (error) {
    console.error('Error fetching video:', error);
    throw new Error(`Failed to fetch video: ${error.message}`);
  }
}


async function processVideosWithGemini(videos,blogUrls) {
  try {
    const videoParts = await Promise.all(
      videos.map(async (video) => {
        const base64Data = await fetchVideoAsBase64(video.url);
        return {
          inlineData: {
            data: base64Data,
            mimeType: 'video/mp4'
          }
        };
      })
    );

    console.log('Fetched all videos as base64');

    const prompt = `Please analyze these related videos and blog posts together and provide a comprehensive analysis without missing out on a single detail since this will be used as knowledge base for answering questions about the video and the blog.`;

    const model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
         });
    console.log('Model:', model);     
    const result = await model.generateContent([
      ...videoParts,
      ...blogUrls,
      { text: prompt }
    ]);
    console.log('Result:', result);
    const response = await result.response;
    console.log(response.usageMetadata);
    return response.text();
  } catch (error) {
    console.error('Error processing videos with Gemini:', error);
    throw error;
  }
}

function validateVideoRequests(videos,blogUrls) {
  if (!Array.isArray(videos)) {
    throw new Error('Request must contain an array of video objects');
  }
  if (!Array.isArray(blogUrls)) {
    throw new Error('Blog URLs must be an array');
  }
  videos.forEach((video, index) => {
    if (!video.url || !video.videoId ) {
      throw new Error(`Video at index ${index} is missing required fields (url or videoId)`);
    }
    if (typeof video.url !== 'string' || typeof video.videoId !== 'string') {
      throw new Error(`Video at index ${index} has invalid field types`);
    }
  });
  blogUrls.forEach((url, index) => {
    if (typeof url !== 'string') {
      throw new Error(`Blog URL at index ${index} is not a string`);
    }
  });
}


async function handleVideoUpload(req, res) {
  const tempFiles = [];
  try {
    const { videos, blogUrls } = req.body;  
    console.log('Request videos:', videos);
    console.log('Request blogUrls:', blogUrls);
    
    validateVideoRequests(videos, blogUrls);
   
    console.log('Processing videos:', videos.map(video => video.url));
    console.log('Processing blog posts:', blogUrls);
   
    const combinedAnalysis = await processVideosWithGemini(videos, blogUrls);
    console.log('Combined analysis:', combinedAnalysis);

    const batch = db.batch();

    videos.forEach((video) => {
      const docRef = db.collection('videos').doc(video.videoId);
      batch.update(docRef, { analysis: combinedAnalysis });
    });

    await batch.commit();

    res.json({ success: true });

  } catch (error) {
    console.error('Error in video upload handler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
 
}

module.exports = { handleVideoUpload };