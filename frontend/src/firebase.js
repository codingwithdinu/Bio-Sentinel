// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVa-AQdZC5fFbF6lRkbifH6tT0qHhCopk",
  authDomain: "bio-sentinel-9447f.firebaseapp.com",
  projectId: "bio-sentinel-9447f",
  storageBucket: "bio-sentinel-9447f.firebasestorage.app",
  messagingSenderId: "288540676230",
  appId: "1:288540676230:web:7e60f5298d8e31e72a4107",
  measurementId: "G-Q8G6GJ6NJJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);