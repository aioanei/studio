
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
console.log("Firebase Config being used (from environment variables):", firebaseConfig);

if (!firebaseConfig.projectId) {
  console.error(
    "Firebase projectId is missing or undefined in the loaded firebaseConfig! " +
    "Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set correctly. " +
    "You may also need to restart your development server after updating the .env file."
  );
  // Optionally, throw an error to halt execution if critical,
  // but for now, we'll let it proceed so other logs might appear.
}

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    // Only attempt to initialize if projectId is somewhat valid,
    // though initializeApp might still fail if other critical parts are missing.
    if (firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig);
    } else {
      throw new Error("Cannot initialize Firebase: projectId is missing from config.");
    }
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
  // Only attempt to get Firestore if app was initialized
  if (app) {
    db = getFirestore(app);
  } else {
    // This case should ideally be caught by the app initialization error handling.
    console.error("Firebase app was not initialized, cannot get Firestore instance.");
    // throw new Error("Firebase app not initialized."); // Or handle gracefully
  }
} catch (e) {
  console.error("Error getting Firestore instance:", e);
  // Depending on how you want to handle this, you might re-throw or set db to null
  throw e; // Re-throw to make it visible
}

export { app, db };
