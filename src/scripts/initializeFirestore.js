import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

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
const db = getFirestore(app);
const auth = getAuth(app);

// Sample data
const sampleData = {
  users: [
    {
      email: 'dealer@example.com',
      password: 'dealer123',
      name: 'Sample Dealer',
      userType: 'dealer',
      dealerKey: '1234567',
      address: '123 Dealer St',
      phoneNumber: '1234567890'
    },
    {
      email: 'retailer@example.com',
      password: 'retailer123',
      name: 'Sample Retailer',
      userType: 'retailer',
      address: '456 Retail Ave',
      phoneNumber: '0987654321'
    },
    {
      email: 'testdealer@example.com',
      password: 'test123',
      name: 'Test Dealer',
      userType: 'dealer',
      dealerKey: '7654321',
      address: '123 Test St',
      phoneNumber: '1234567890'
    }
  ],
  products: [
    {
      name: 'Sample Product 1',
      description: 'This is a sample product',
      price: 99.99,
      stock: 100,
      dealerId: '', // Will be set after dealer creation
      dealerName: 'Sample Dealer'
    },
    {
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      stock: 100,
      dealerId: '', // Will be set after dealer creation
      dealerName: 'Test Dealer'
    }
  ]
};

async function initializeFirestore() {
  try {
    console.log('Starting initialization...');
    
    const createdUsers = {};
    
    // Create users
    for (const userData of sampleData.users) {
      console.log('Creating user:', userData.email);
      
      try {
        // Create auth user
        const { user } = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );

        console.log('Auth user created:', user.uid);

        // Create user document
        const { password, ...userDataWithoutPassword } = userData;
        await setDoc(doc(db, 'users', user.uid), userDataWithoutPassword);
        
        console.log('User document created');

        // Store user data for later use
        createdUsers[userData.email] = {
          uid: user.uid,
          ...userDataWithoutPassword
        };

        // If this is the dealer, create sample products
        if (userData.userType === 'dealer') {
          console.log('Creating products for dealer:', user.uid);
          
          const products = sampleData.products
            .filter(product => product.dealerName === userData.name)
            .map(product => ({
              ...product,
              dealerId: user.uid
            }));

          for (const product of products) {
            await addDoc(collection(db, 'products'), product);
          }
          
          console.log('Products created for dealer');
        }
      } catch (error) {
        // Skip if user already exists
        if (error.code === 'auth/email-already-in-use') {
          console.log('User already exists:', userData.email);
        } else {
          throw error;
        }
      }
    }

    // Create retailer connections
    if (createdUsers['retailer@example.com'] && createdUsers['dealer@example.com']) {
      console.log('Creating retailer connection...');
      
      const retailer = createdUsers['retailer@example.com'];
      const dealer = createdUsers['dealer@example.com'];

      await addDoc(collection(db, 'retailer_connections'), {
        retailerId: retailer.uid,
        retailerName: retailer.name,
        dealerId: dealer.uid,
        dealerName: dealer.name,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      console.log('Retailer connection created');
    }

    console.log('Initialization complete!');
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Run the initialization
initializeFirestore();
