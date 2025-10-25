import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDG1XXeiOHbPEso9Dn1plEx0DjH_o6TKpE",
  authDomain: "cooworker-600fc.firebaseapp.com",
  projectId: "cooworker-600fc",
  storageBucket: "cooworker-600fc.firebasestorage.app",
  messagingSenderId: "163514000802",
  appId: "1:163514000802:web:9b6517723f6f38d8247efb",
  measurementId: "G-CMBS2YFJM5",
};

const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((supported) => {
        if (supported) {
          getAnalytics(app);
        }
      })
    )
    .catch(() => {
      // Analytics is optional; ignore failures so auth keeps working.
    });
}

export const auth = getAuth(app);
