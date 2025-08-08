// config.example.js - Safe to commit to Git
// Copy this file to config.js and add your actual API keys

export const SecureConfig = {
  // Your Firebase project configuration
  FIREBASE_CONFIG: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  },

  // Your Google Generative AI API Key
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE'
};