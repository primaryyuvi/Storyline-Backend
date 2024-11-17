const { initializeServices } = require("./firebase");
const { v4: uuidv4 } = require("uuid");
const { db, storage, genAI, fileManager } = initializeServices();




async function handleQuestionsWithContext(req, res) {
    const { sessionId, messageId,  isFirstMessage ,userId} = req.query;
    const { context , question } = req.body;
  
  

    console.log("context", context);
    console.log("isFirstMessage", isFirstMessage);
    console.log("sessionId", sessionId);
    console.log("messageId", messageId);
    console.log("question", question);
  
    try {
    
      let conversationHistory = [];
      const realContext = context +" Please answer the questions based on the context provided. If the question is unanswerable, please respond with I don't know the answer to the question as it is out of the context of the video"
  
      if (isFirstMessage === 'true') {
        if (context != "") {
          conversationHistory.push({
            role: 'user',
            parts: [{ text: `Context: ${realContext}` }]
          });
        }
      } else {
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

      // conversationHistory.push({
      //   role: 'user',
      //   parts: [{ text: question }]
      // });

      console.log("conversationHistory", conversationHistory.parts);
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat({
        history: conversationHistory,
      });
      const result = await chat.sendMessage(question);
      const aiResponse = result.response;
      console.log("aiResponse", aiResponse.text());
      console.log("aiResponse", aiResponse.usageMetadata);

      const aiMessage = {
        id: uuidv4(),
        message: aiResponse.text(),
        user: false,
        userId: userId,
        sessionId: sessionId,
        timestamp: Date.now()
      };
      await db.collection('messages').add(aiMessage);
  
      res.json({
        success : true,
      });
    } catch (error) {
      console.error('Error in question handler:', error);
      res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { handleQuestionsWithContext };
