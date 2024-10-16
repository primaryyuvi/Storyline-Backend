const { initializeServices } = require("./firebase");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const cheerio = require("cheerio");
const { db, storage, genAI, fileManager } = initializeServices();




async function handlequestionsWithContext(req, res) {
    const { sessionId, userId, contextUrl, isFirstMessage } = req.query;
    const { content } = req.body;
  
    if (!userId) {
      res.status(400).send('UserId is required');
      return;
    }
  
    try {
      // Store user message
      const userMessage = {
        id: uuidv4(),
        message: content,
        user: true,
        userId: userId,
        sessionId: sessionId,
        timestamp: Date.now()
      };
      let conversationHistory = [];
  
      if (isFirstMessage === 'true') {
        // Fetch context for new session from the provided URL
        if (contextUrl != "") {
          conversationHistory.push({
            role: 'system',
            parts: `Context: ${contextUrl}`
          });
        }
      } else {
        // Get existing chat history
        const chatHistory = await db.collection('messages')
          .where('sessionId', '==', sessionId)
          .orderBy('timestamp')
          .get();
  
        conversationHistory = chatHistory.docs.map(doc => {
          const data = doc.data();
          return {
            role: data.user ? 'user' : 'model',
            parts: data.message
          };
        });
      }
  
      // Add the current user message to the conversation history
      conversationHistory.push({
        role: 'user',
        parts: content
      });
  
      // Get response from Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: conversationHistory,
      });
      const result = await chat.sendMessage(content);
      const aiResponse = result.response;
  
      // Store AI message
      const aiMessage = {
        id: uuidv4(),
        message: aiResponse.text(),
        user: false,
        userId: userId,
        sessionId: currentSessionId,
        timestamp: Date.now()
      };

      await db.collection('messages').add(userMessage);
      await db.collection('messages').add(aiMessage);
  
      // Send both user and AI messages back to the client, along with the sessionId
      res.json({
        success : true,
        answer : aiResponse.text(),
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('An error occurred while processing your request');
    }
}

module.exports = { handlequestionsWithContext };
