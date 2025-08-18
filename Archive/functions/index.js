const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// It's best practice to set your API key in the environment
// Run this command in your terminal: firebase functions:config:set gemini.key="YOUR_API_KEY"
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

exports.categorizeTransaction = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transactionData = snap.data();
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    // Ensure the function doesn't re-process its own updates
    if (transactionData.status === 'categorized' || transactionData.status === 'error') {
        return null;
    }

    const prompt = `
      You are an expert financial assistant. Analyze the following transaction description and categorize it.
      Rules:
      - If the description includes 'rent', 'tenant', or 'zillow', the category is 'Real Estate Income'.
      - If it includes 'venmo', 'cash app', or 'zelle' and is a credit, categorize based on the memo if possible, otherwise 'Personal Income'.
      - If it includes 'transfer', 'tfr', or is moving between known user accounts, the category is 'Transfer'.
      - Common expenses: 'amzn' or 'amazon' is 'Shopping', 'chevron' or 'shell' is 'Gas', 'netflix' is 'Subscriptions'.
      Description: "${transactionData.description}"
      Respond with only a JSON object with two keys: "category" and "isTransfer" (a boolean).
      Example: {"category": "Gas", "isTransfer": false}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      // A safer way to extract JSON from the model's text response
      const jsonString = response.text().match(/\{[\s\S]*\}/)[0];
      const categorization = JSON.parse(jsonString);

      return snap.ref.update({
        category: categorization.category,
        isTransfer: categorization.isTransfer,
        status: 'categorized'
      });

    } catch (error) {
      console.error("Error with Gemini or Firestore update:", error);
      return snap.ref.update({ status: 'error', errorMessage: error.message });
    }
  });
