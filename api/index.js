const express = require('express');
const bodyParser = require("body-parser");
const cors = require('cors');
const { handleVideoUpload } = require('../uploadVideo');
const { handlequestions } = require('../questions');
const {handleQuestionsWtihContext} = require('../questions2');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/api/upload-video', handleVideoUpload);

app.post('/api/questions', express.json(), handlequestions);

app.post('/api/question',express.json(), handleQuestionsWtihContext);

app.get("/api", (req, res) => {
    res.status(200).json({ message: "For Testing" });
  });

  app.listen(3000, () => {
    console.log(`Server is running at http://localhost:${3000}`);
  });
module.exports = app;