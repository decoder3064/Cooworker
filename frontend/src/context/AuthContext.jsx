import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const loadingScreenStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  fontSize: "1.25rem",
};

const AuthContext = createContext(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const signup = useCallback(async (email, password) => {
    try {
      setError(null);
      const credentials = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userRecord = credentials.user;
      await setDoc(doc(db, "Users", userRecord.uid), {
        uid: userRecord.uid,
        email: userRecord.email || email,
        tools: [],
      });

      return credentials;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    return signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      signup,
      logout,
    }),
    [user, loading, error, login, signup, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="loading-screen" style={loadingScreenStyles}>
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
