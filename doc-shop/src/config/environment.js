/**
 * Environment & Integration Configurations
 */

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

export const ENV = {
  APP_ID: typeof __app_id !== "undefined" ? __app_id : "default-app-id-uniquekey",

  FIREBASE: {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBxmiftXIFryutSJJFnRQtqE5NsIuswbj8",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "dienkon-doc-shop.firebaseapp.com",
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://dienkon-doc-shop-default-rtdb.firebaseio.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "dienkon-doc-shop",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "dienkon-doc-shop.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "711883976718",
    appId: env.VITE_FIREBASE_APP_ID || "1:711883976718:web:9dce1c4d823f5e743d4c5f",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-BZFV9FD6LE",
  },

  KEY_FIREBASE: {
    apiKey: env.VITE_KEY_FIREBASE_API_KEY || "AIzaSyDnSzYda3CUXNtWrW8ytW2Wnx3mFunC9Ig",
    authDomain: env.VITE_KEY_FIREBASE_AUTH_DOMAIN || "uniquekey-a0912.firebaseapp.com",
    databaseURL: env.VITE_KEY_FIREBASE_DATABASE_URL || "https://uniquekey-a0912-default-rtdb.firebaseio.com",
    projectId: env.VITE_KEY_FIREBASE_PROJECT_ID || "uniquekey-a0912",
    storageBucket: env.VITE_KEY_FIREBASE_STORAGE_BUCKET || "uniquekey-a0912.firebasestorage.app",
    messagingSenderId: env.VITE_KEY_FIREBASE_MESSAGING_SENDER_ID || "440795775727",
    appId: env.VITE_KEY_FIREBASE_APP_ID || "1:440795775727:web:1c59c88d5039f47a88d11a",
  },

  DISCORD_WEBHOOK_URL: env.VITE_DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1502354251249356995/EGYOmejUXHgZZ5PVe6f8z1x-V6TaFNeB27_ybmlizbaJht-PRijWmqRcXhJewtESUCvG",

  CLOUDINARY: {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || "dys3wgutz",
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || "comic_raw_files_preset",
  },

  UNIQUE_KEY_REDEEM_BASE: env.VITE_UNIQUE_KEY_REDEEM_BASE || "https://dienkon.github.io/UniqueKey/#redeem?key=",

  CHATBOT: {
    apiKey: (typeof window !== "undefined" && (window.CHATBOT_API_KEY || window.OPENAI_API_KEY)) || env.VITE_CHATBOT_API_KEY || "",
    model: (typeof window !== "undefined" && window.CHATBOT_API_MODEL) || env.VITE_CHATBOT_API_MODEL || "gpt-4o-mini",
    apiUrl: env.VITE_CHATBOT_API_URL || "https://api.openai.com/v1/chat/completions",
  },

  GEMINI: {
    apiKey: (typeof window !== "undefined" && (window.GEMINI_API_KEY || window.__GEMINI_API_KEY)) || env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6IN26kW2Y19as279t01oGlKlYqXwbjlIkjLcC7Hu_OLPg",
    model: env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite",
    apiUrl: env.VITE_GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models",
  },
};

