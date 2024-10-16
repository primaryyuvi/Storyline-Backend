
// // Assuming you've already initialized Firebase and Gemini in a separate file
// const { initializeServices } = require('./firebase');
// const { GoogleAIFileManager } = require( "@google/generative-ai/server")
// const axios = require('axios');

// const { db, storage,genAI, fileManager } = initializeServices();

// async function handleVideoUpload(req, res) {
//   try {
//     const { url,videoId } = req.body;

//     if (!url) {
//       return res.status(400).json({ success: false, error: 'Video URL is required' });
//     }

    
//     if (!genAI) {
//       console.error('Gemini AI is not initialized');
//       return res.status(500).json({ success: false, error: 'AI service is not available' });
//     }

//     console.log(url);
//     const uploadResponse = await fileManager.uploadFile(url, {
//       mimeType: "video/mp4",
//       displayName: url,
//     });
    
//     // View the response.
//     console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

//     // const response = await axios.get(url, { responseType: 'blob' });
//     // console.log(response);
//     const uri = getURIfromFirebaseURL(url);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//     const result = await model.generateContent([{
//       fileData: {
//         mimeType: uploadResponse.file.mimeType,
//         fileUri: uploadResponse.file.uri
//       }
//     },
//     ]);
//     const videoAnalysis = await result.response.text();
//     const docRef = await db.collection('videos').document(videoId).update({ analysis: videoAnalysis });
//     console.log(videoAnalysis)
//     console.log('Video uploaded successfully:', docRef.id);
//     res.json({ success: true, videoId: docRef.id });
//   } catch (error) {
//     console.error('Error in video upload handler:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// }

// function getURIfromFirebaseURL(firebaseURL) {
//   // Remove the base URL and file path
//   const uriString = firebaseURL.replace('https://firebasestorage.googleapis.com/v0/b/', '').replace('/o/', '');

//   // Decode the URI
//   const uri = decodeURIComponent(uriString);

//   return uri;
// }

// module.exports = { handleVideoUpload };


const { initializeServices } = require('./firebase');
const axios = require('axios');

const { db, storage, genAI } = initializeServices();

async function handleVideoUpload(req, res) {
  try {
    const { url, videoId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Video URL is required' });
    }
    if (!genAI) {
      console.error('Gemini AI is not initialized');
      return res.status(500).json({ success: false, error: 'AI service is not available' });
    }

    console.log('Fetching video from:', url);
    const ref = storage.refFromURL(url);
    ref.get
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(response.data, 'binary');
    const base64Video = videoBuffer.toString('base64');

    console.log('Video fetched, size:', videoBuffer.length, 'bytes');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'video/mp4',
          data: base64Video
        }
      },
    ]);

    const videoAnalysis = await result.response.text();

    await db.collection('videos').doc(videoId).update({ analysis: videoAnalysis });
    
    console.log('Video analysis completed and saved');
    res.json({ success: true, videoId: videoId });
  } catch (error) {
    console.error('Error in video upload handler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { handleVideoUpload };