import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXcH8anFAy8xWfQnfHcb1Pyf9J1aM0DDE",
  authDomain: "meesho-otp-app.firebaseapp.com",
  projectId: "meesho-otp-app",
  storageBucket: "meesho-otp-app.firebasestorage.app",
  messagingSenderId: "1072891073742",
  appId: "1:1072891073742:web:45c74a35645756159b6c9f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Enforce permanent local persistence so login survives app restarts, updates & webview refreshes
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export default app;
