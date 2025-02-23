import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase, ref, onValue, goOnline, goOffline } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCJVSqPOedRmMqV25ZnL0CEXvqkLJKY2tQ",
  authDomain: "getyouritem-c7e0e.firebaseapp.com",
  projectId: "getyouritem-c7e0e",
  storageBucket: "getyouritem-c7e0e.appspot.com",
  messagingSenderId: "254047789320",
  appId: "1:254047789320:web:d98da75719d7aa5b1f8cbd",
  measurementId: "G-EDJVXF2LCS",
  databaseURL: "https://getyouritem-c7e0e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Enable persistent auth state
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Handle database connection state
let connectedRef = ref(rtdb, '.info/connected');
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    console.log('Connected to Firebase RTDB');
  } else {
    console.log('Disconnected from Firebase RTDB');
  }
});

// Ensure database is online
goOnline(rtdb);

// Handle window unload
window.addEventListener('unload', () => {
  goOffline(rtdb);
});

// Database rules
const databaseRules = {
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && ($uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'dealer')",
        "products": {
          ".read": "auth != null",
          ".write": "auth != null && (root.child('users').child($uid).child('role').val() === 'dealer')"
        },
        "connectedDealers": {
          ".read": "auth != null && $uid === auth.uid",
          ".write": "auth != null && $uid === auth.uid"
        },
        "connectedRetailers": {
          ".read": "auth != null && (root.child('users').child($uid).child('role').val() === 'dealer')",
          ".write": "auth != null && (root.child('users').child($uid).child('role').val() === 'dealer')"
        }
      }
    },
    "dealerPhones": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'dealer')",
      "$uid": {
        ".validate": "newData.isString() && newData.val().matches(/^[0-9]{10}$/)"
      }
    }
  }
};

// Log the rules for copying to Firebase Console
console.log('Copy these database rules to Firebase Console:');
console.log(JSON.stringify(databaseRules, null, 2));

export { auth, rtdb, storage };
