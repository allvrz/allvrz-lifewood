#!/bin/bash
# This script creates the firebase-init.js file from environment variables

cat << EOF > firebase-init.js
const firebaseConfig = {
  apiKey: "${VITE_API_KEY}",
  authDomain: "${VITE_AUTH_DOMAIN}",
  projectId: "${VITE_PROJECT_ID}",
  storageBucket: "${VITE_STORAGE_BUCKET}",
  messagingSenderId: "${VITE_MESSAGING_SENDER_ID}",
  appId: "${VITE_APP_ID}"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
EOF
