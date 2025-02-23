import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCJVSqPOedRmMqV25ZnL0CEXvqkLJKY2tQ",
  authDomain: "getyouritem-c7e0e.firebaseapp.com",
  projectId: "getyouritem-c7e0e",
  storageBucket: "getyouritem-c7e0e.appspot.com",
  messagingSenderId: "254047789320",
  appId: "1:254047789320:web:d98da75719d7aa5b1f8cbd",
  measurementId: "G-EDJVXF2LCS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testLogin(email, password) {
  try {
    console.log('Attempting to sign in with:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Successfully signed in:', userCredential.user.uid);

    // Try to get user document
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      console.log('User document found:', userDoc.data());
    } else {
      console.log('No user document found!');
    }
  } catch (error) {
    console.error('Error during login:', error.code, error.message);
  }
}

// Test both sets of credentials
const testCases = [
  { email: 'dealer@example.com', password: 'dealer123' },
  { email: 'testdealer@example.com', password: 'test123' }
];

async function runTests() {
  for (const testCase of testCases) {
    console.log('\nTesting credentials:', testCase.email);
    await testLogin(testCase.email, testCase.password);
  }
}

runTests();
