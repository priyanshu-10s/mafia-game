import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Check if Firebase is properly configured
const isConfigured = apiKey && 
                     apiKey !== 'your-api-key-here' && 
                     apiKey !== '' &&
                     authDomain &&
                     projectId;

// Initialize Firebase only if config is valid
let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isConfigured) {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: authDomain,
      projectId: projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
    };
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
} else {
  console.warn('⚠️ Firebase not configured. Please add your Firebase config to .env file.');
  console.warn('See .env.example for template.');
}

export { auth, db, googleProvider };
export default app;
