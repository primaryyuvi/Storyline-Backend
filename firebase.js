const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require( "@google/generative-ai/server")
require('dotenv').config();

// Firebase initialization
function initializeFirebase() {
  // Load the service account key JSON file
  if (!getApps().length) {
    // Load the service account key JSON file
    const serviceAccount = {
      "type": "service_account",
      "project_id": process.env.FIREBASE_PROJECT_ID,
      "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Initialize the app with a service account, granting admin privileges
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase app already initialized.');
  }

  const db = getFirestore();
  const storage = getStorage();

  return { db, storage };
}


function initializeGemini() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
    console.log('Gemini API initialized successfully');
    return {genAI , fileManager};
  } catch (error) {
    console.error('Error initializing Gemini AI:', error);
    throw error;
  }
}

function initializeServices() {
  try {
    const { db, storage } = initializeFirebase();
    const {genAI , fileManager}= initializeGemini();

    if (!genAI) {
      throw new Error('Gemini AI failed to initialize');
    }

    return { db, storage, genAI , fileManager};
  } catch (error) {
    console.error('Error in service initialization:', error);
    throw error;
  }
}

module.exports = { initializeServices };
