import { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { serverTimestamp } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth, rtdb } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const userRef = ref(rtdb, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const profile = snapshot.val();
            setUserProfile(profile);
            await update(userRef, {
              lastSeen: serverTimestamp()
            });
          } else {
            console.error('User profile not found in database');
            setError('User profile not found. Please contact support.');
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setError('Authentication error. Please try again.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // Attempt login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error('No user returned from authentication');
      }

      // Get user profile
      const userRef = ref(rtdb, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error('User profile not found');
      }

      const userData = snapshot.val();
      
      // Verify user role
      if (!userData.role) {
        throw new Error('Invalid user role');
      }

      // Update last login and last seen
      await update(userRef, {
        lastLogin: serverTimestamp(),
        lastSeen: serverTimestamp()
      });

      // Update local state
      setUser(user);
      setUserProfile(userData);

      // Navigate to appropriate dashboard
      const dashboardPath = `/${userData.role}-dashboard`;
      navigate(dashboardPath, { replace: true });
      
      toast.success('Login successful!');
      return userData;

    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to login. Please try again.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, role, phone) => {
    let user = null;

    try {
      // Input validation
      if (!email || !password || !name || !role || !phone) {
        throw new Error('All fields are required');
      }

      // Validate email format
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Invalid email format');
      }

      // Validate phone number
      if (!/^\d{10}$/.test(phone)) {
        throw new Error('Phone number must be 10 digits');
      }

      // Create auth user first
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;

      // Create base profile
      const baseProfile = {
        uid: user.uid,
        email,
        name,
        role,
        phone,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      };

      // Create profile based on role
      const profile = role === 'dealer' 
        ? {
            ...baseProfile,
            products: {},
            connectedRetailers: {},
          }
        : {
            ...baseProfile,
            connectedDealer: null,
            orders: {},
          };

      // Store in appropriate location
      const updates = {};
      updates[`/users/${user.uid}`] = baseProfile;
      updates[`/${role}s/${user.uid}`] = profile;

      // Update database
      await update(ref(rtdb), updates);

      // Update auth display name
      await updateProfile(user, {
        displayName: name
      });

      // Set local state
      setUser(user);
      setUserProfile(profile);

      return { user, profile };

    } catch (error) {
      console.error('Registration error details:', error);

      // If we created a user but database operations failed, clean up
      if (user) {
        try {
          await user.delete();
        } catch (deleteError) {
          console.error('Error cleaning up auth user:', deleteError);
        }
      }

      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email format');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters');
      } else if (error.code === 'PERMISSION_DENIED') {
        throw new Error('Database access denied. Please check your permissions.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      if (userProfile?.uid) {
        // Update last seen
        await update(ref(rtdb, `users/${userProfile.uid}`), {
          lastSeen: serverTimestamp()
        });
      }
      await signOut(auth);
      setUserProfile(null);
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
