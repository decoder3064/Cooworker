// Firebase core imports
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

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
googleProvider.setCustomParameters({ prompt: "select_account" });

// Check if a user exists in Firestore
export async function checkUserExists(uid) {
  const userRef = doc(db, "Users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists();
}

// Create a new user in Firestore
export async function createNewUser(uid, userData) {
  const userRef = doc(db, "Users", uid);
  await setDoc(userRef, {
    auth_id: uid,
    display_name: userData.displayName || "",
    email: userData.email || "",
    services: [],
  });
}

// Google sign-in helper
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result;
}

async function getUserProfile(uid) {
  const primaryRef = doc(db, "Users", uid);
  let snap = await getDoc(primaryRef);

  if (snap.exists()) {
    return { snap, ref: primaryRef };
  }

  const fallbackRef = doc(db, "users", uid);
  snap = await getDoc(fallbackRef);

  if (!snap.exists()) {
    throw new Error("User profile not found");
  }

  return { snap, ref: fallbackRef };
}

export async function create_workspace(userUUID, workspaceName) {
  const { snap: userSnap } = await getUserProfile(userUUID);
  const userData = userSnap.data() || {};
  const displayName =
    userData.display_name ||
    userData.displayName ||
    userData.name ||
    userData.fullName ||
    userData.email ||
    "Unknown user";

  const workspaceRef = doc(collection(db, "workspaces"));
  const workspaceData = {
    id: workspaceRef.id,
    name: workspaceName,
    hostId: userUUID,
    hostName: displayName,
    participantCount: 1,
    createdAt: serverTimestamp(),
  };

  await setDoc(workspaceRef, workspaceData);

  const participantRef = doc(
    collection(workspaceRef, "participants"),
    userUUID
  );
  await setDoc(participantRef, {
    userId: userUUID,
    displayName,
    role: "host",
    joinedAt: serverTimestamp(),
    workspaceId: workspaceRef.id,
  });

  return workspaceRef.id;
}

export async function join_workspace(userUUID, workspaceID) {
  const workspaceRef = doc(db, "workspaces", workspaceID);
  const workspaceSnap = await getDoc(workspaceRef);

  if (!workspaceSnap.exists()) {
    return false;
  }

  const participantRef = doc(
    collection(workspaceRef, "participants"),
    userUUID
  );
  const participantSnap = await getDoc(participantRef);
  if (participantSnap.exists()) {
    return true;
  }

  const { snap: userSnap } = await getUserProfile(userUUID);
  const userData = userSnap.data() || {};
  const displayName =
    userData.display_name ||
    userData.displayName ||
    userData.name ||
    userData.fullName ||
    userData.email ||
    "Unknown user";

  await setDoc(participantRef, {
    userId: userUUID,
    displayName,
    role: "member",
    joinedAt: serverTimestamp(),
    workspaceId: workspaceID,
  });

  await updateDoc(workspaceRef, {
    participantCount: increment(1),
  });

  return true;
}

export async function get_workspaces(userUUID) {
  const workspacesRef = collection(db, "workspaces");
  const workspacesSnapshot = await getDocs(workspacesRef);

  if (workspacesSnapshot.empty) {
    console.log("No workspaces found in the database.");
    return [];
  }

  const allWorkspaces = workspacesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const participationChecks = allWorkspaces.map(async (workspace) => {
    const participantRef = doc(
      db,
      "workspaces",
      workspace.id,
      "participants",
      userUUID
    );
    const participantSnap = await getDoc(participantRef);
    return participantSnap.exists() ? workspace : null;
  });

  const userWorkspacesResults = await Promise.all(participationChecks);
  const userWorkspaces = userWorkspacesResults.filter(
    (workspace) => workspace !== null
  );

  userWorkspaces.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return userWorkspaces;
}
