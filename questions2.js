const { initializeServices } = require("./firebase");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const cheerio = require("cheerio");
const { db, storage, genAI, fileManager } = initializeServices();




async function handleQuestionsWithContext(req, res) {
    const { sessionId, messageId, contextUrl, isFirstMessage ,userId} = req.query;
    const { question } = req.body;
  
  

    console.log("contextUrl", contextUrl);
    console.log("isFirstMessage", isFirstMessage);
    console.log("sessionId", sessionId);
    console.log("messageId", messageId);
    console.log("content", question);
  
    try {
    
      let conversationHistory = [];
      const prompt = question +" Please answer the question based on the video context provided. If the question is unanswerable, please respond with I don't know the answer to the question as it is out of the context of the video"
  
      if (isFirstMessage === 'true') {
        // Fetch context for new session from the provided URL
        if (contextUrl != "") {
          conversationHistory.push({
            role: 'user',
            parts: [{ text: `Context: ${contextUrl}` }]
          });
        }
      } else {
        // Get existing chat history
        const chatHistory = await db.collection('messages')
          .where('sessionId', '==', sessionId)
          .where('id', '!=', messageId)
          .orderBy('timestamp')
          .get();
  
        conversationHistory = chatHistory.docs.map(doc => {
          const data = doc.data();
          console.log("data", data.id);
          return {
            role: data.user ? 'user' : 'model',
            parts: [{ text: data.message }]
          };
        });
      }
  
      // Add the current user message to the conversation history
      conversationHistory.push({
        role: 'user',
        parts: [{ text: question }]
      });
  
      console.log("conversationHistory", conversationHistory);
      // Get response from Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const chat = model.startChat({
        history: conversationHistory,
      });
      const result = await chat.sendMessage(question);
      const aiResponse = result.response;
  
      // Store AI message
      const aiMessage = {
        id: uuidv4(),
        message: aiResponse.text(),
        user: false,
        userId: userId,
        sessionId: sessionId,
        timestamp: Date.now()
      };
      await db.collection('messages').add(aiMessage);
  
      // Send both user and AI messages back to the client, along with the sessionId
      res.json({
        success : true,
        answer : aiResponse.text(),
      });
    } catch (error) {
      console.error('Error in question handler:', error);
      res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { handleQuestionsWithContext };
