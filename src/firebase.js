import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase using the Singleton design pattern
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with multi-tab persistent cache enabled to support offline operations in low-coverage hospital areas
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
