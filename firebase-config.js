/*
  Firebase Configuration
  ─────────────────────
  To enable likes and notes, create a free Firebase project:

  1. Go to https://console.firebase.google.com
  2. Create a new project (disable Google Analytics if you want)
  3. Go to Build → Firestore Database → Create database → Start in test mode
  4. Go to Project Settings (gear icon) → General → Your apps → Add web app
  5. Copy the config values below

  Then set these Firestore security rules (Database → Rules):

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /likes/{photoId} {
        allow read: if true;
        allow write: if true;
      }
      match /notes/{noteId} {
        allow read: if true;
        allow create: if true;
        allow update, delete: if false;
      }
    }
  }
*/

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
