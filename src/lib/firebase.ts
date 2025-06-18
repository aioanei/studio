
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log the config to help with debugging
console.log("Firebase Config being used:", firebaseConfig);

if (!firebaseConfig.projectId) {
  console.error("Firebase projectId is missing! Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set correctly.");
  // Optionally, throw an error to halt execution if critical
  // throw new Error("Firebase projectId is missing. App cannot connect to Firebase.");
}

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Error initializing Firebase app:", e);
    // Prevent further errors by not trying to get Firestore instance if app init failed
    throw e; // Re-throw to make it visible
  }
} else {
  app = getApp();
}

let db;
try {
  db = getFirestore(app);
} catch (e) {
  console.error("Error getting Firestore instance:", e);
  // Depending on how you want to handle this, you might re-throw or set db to null
  throw e; // Re-throw to make it visible
}

export { app, db };
