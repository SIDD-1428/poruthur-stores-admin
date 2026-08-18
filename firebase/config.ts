import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBD3KJ4C9EzTL9HZZRqGFmCBYbgLnUKc8E",
  authDomain: "poruthurstores-1bb74.firebaseapp.com",
  projectId: "poruthurstores-1bb74",
  storageBucket: "poruthurstores-1bb74.firebasestorage.app",
  messagingSenderId: "784163241119",
  appId: "1:784163241119:web:3187c26b98f7313b6736aa",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);