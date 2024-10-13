const { db, storage, genAI } = require('.//firebase');

async function handlequestions(req,res){
    try {
        const { videoId, question } = req.body;
        const videoDoc = await db.collection('videos').doc(videoId).get();
        const videoData = videoDoc.data();
    
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
          Video context: ${videoData.analysis}
          User question: ${question}
          Please answer the question based on the video context provided. 
          If the question is unanswerable, please respond with "I don't know the answer to the question as it is out of the context of the video".
        `;
        const result = await model.generateContent(prompt);
        const answer = await result.response.text();
    
        res.json({ success: true, answer });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
}

module.exports = { handlequestions };