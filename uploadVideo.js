
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
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);
const { db, storage, genAI } = initializeServices();


// const tempDir = path.join(__dirname, 'temp');
// if (!fs.existsSync(tempDir)) {
//   fs.mkdirSync(tempDir);
// }

// // Function to create FileData object from file
// async function createFileData(filePath, mimeType = 'video/mp4') {
//   const fileData = await readFileAsync(filePath);
//   return {
//     data: fileData,
//     mimeType: mimeType
//   };
// }

// // Function to download video to temp file
// async function downloadVideoToTemp(videoUrl) {
//   try {
//     const response = await axios({
//       method: 'GET',
//       url: videoUrl,
//       responseType: 'arraybuffer'
//     });
    
//     const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);
//     await writeFileAsync(tempFilePath, response.data);
    
//     console.log(`Video downloaded to: ${tempFilePath}`);
//     return tempFilePath;
//   } catch (error) {
//     console.error('Error downloading video:', error);
//     throw new Error(`Failed to download video: ${error.message}`);
//   }
// }

// // Function to process videos with Gemini
// async function processVideosWithGemini(filePaths) {
//   try {
//     // Create FileData objects for each video
//     const videoParts = await Promise.all(
//       filePaths.map(async (filePath) => {
//         const fileData = await createFileData(filePath);
//         return {
//           inlineData: {
//             data: fileData.data.toString('base64'),
//             mimeType: fileData.mimeType
//           }
//         };
//       })
//     );

//     const prompt = `Please analyze these related videos together.
// Please be detailed and specific in your analysis. Gather every single detail you can get from the video and provide a comprehensive analysis.`;

//     // Create multi-part prompt
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-pro",
//     });
//     const result = await model.generateContent([
//       ...videoParts,
//       { text: prompt }
//     ]);

//     const response = await result.response;
//     return response.text();
//   } catch (error) {
//     console.error('Error processing videos with Gemini:', error);
//     throw error;
//   }
// }

// // Function to cleanup temporary files
// async function cleanupTempFiles(filePaths) {
//   for (const filePath of filePaths) {
//     try {
//       await unlinkAsync(filePath);
//       console.log(`Cleaned up temporary file: ${filePath}`);
//     } catch (error) {
//       console.error(`Error cleaning up file ${filePath}:`, error);
//     }
//   }
// }

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

// Function to process videos with Gemini
async function processVideosWithGemini(videos,blogUrls) {
  try {
    // Fetch all videos as base64
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

    // Create multi-part prompt
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
    // const { videoUrls } = req.body;
    // const urlsArray = Array.isArray(videoUrls) ? videoUrls : [videoUrls];
    
    // console.log('Processing videos:', urlsArray);
    
    // // Download videos to temp files
    // for (const url of urlsArray) {
    //   const tempPath = await downloadVideoToTemp(url);
    //   tempFiles.push(tempPath);
    // }
    
    // console.log('Successfully downloaded all videos to temp files');
    
    // // Process all videos together
    // const combinedAnalysis = await processVideosWithGemini(tempFiles);
    // console.log('Combined analysis:', combinedAnalysis);

    const { videos, blogUrls } = req.body;  // Access directly from req.body, not req.body.request
    console.log('Request videos:', videos);
    console.log('Request blogUrls:', blogUrls);
    
    validateVideoRequests(videos, blogUrls);
   
    console.log('Processing videos:', videos.map(video => video.url));
    console.log('Processing blog posts:', blogUrls);
   
    // Process all videos together
    const combinedAnalysis = await processVideosWithGemini(videos, blogUrls);
    console.log('Combined analysis:', combinedAnalysis);


    // Save combined analysis to database
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