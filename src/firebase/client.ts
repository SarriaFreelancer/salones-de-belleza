"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

// The full Firebase client-side SDK.
export const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
