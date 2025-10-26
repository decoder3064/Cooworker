// Firebase core imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';


// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Check if a user exists in Firestore
export async function checkUserExists(uid) {
  const userRef = doc(db, 'Users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists();
}

// Create a new user in Firestore
export async function createNewUser(uid, userData) {
  const userRef = doc(db, 'Users', uid);
  await setDoc(userRef, {
    auth_id: uid,
    display_name: userData.displayName || '',
    email: userData.email || '',
    services: []
  });
}

// Google sign-in helper
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result;
}
