const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

  // Get Firestore and Storage instances
  const db = getFirestore();
  const storage = getStorage();

  return { db, storage };
}

// Gemini initialization
function initializeGemini() {
  // Initialize the Gemini API with your API key
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  console.log('Gemini API initialized successfully');

  return genAI;
}

// Main initialization function
function initializeServices() {
  const { db, storage } = initializeFirebase();
  const genAI = initializeGemini();

  return { db, storage, genAI };
}

// Export the initialization function
module.exports = { initializeServices };
