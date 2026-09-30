import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
export default app;
