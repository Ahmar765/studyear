// src/lib/firebase/client-app.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

let appInstance: FirebaseApp | null = null;

/**
 * Lazy init so missing build-time env does not throw during module evaluation (SSR / first paint).
 * Call from client code or server actions that use the client SDK (e.g. callable Functions).
 */
export function getFirebaseApp(): FirebaseApp {
  if (appInstance) {
    return appInstance;
  }

  const apiKey = firebaseConfig.apiKey?.trim();
  const projectId = firebaseConfig.projectId?.trim();
  const appId = firebaseConfig.appId?.trim();

  if (!apiKey || !projectId || !appId) {
    throw new Error(
      "Firebase web config is incomplete. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID (and related vars) for Firebase App Hosting build and runtime.",
    );
  }

  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
