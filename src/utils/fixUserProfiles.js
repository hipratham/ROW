import { rtdb } from '../config/firebase';
import { ref, get, update } from 'firebase/database';

// Helper function to generate 7 character alphanumeric code
const generateDealerCode = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Generate a 7-character code
    code = Array.from({ length: 7 }, () => 
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Check if code exists
    const snapshot = await get(ref(rtdb, `dealerCodes/${code}`));
    if (!snapshot.exists()) {
      isUnique = true;
    }
  }

  return code;
};

export const fixUserProfiles = async () => {
  try {
    // Get all users
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      console.log('No users found');
      return;
    }

    const updates = {};
    const promises = [];

    // Convert snapshot to array for async operations
    const users = [];
    snapshot.forEach((childSnapshot) => {
      users.push({
        id: childSnapshot.key,
        data: childSnapshot.val()
      });
    });

    // Process each user
    for (const { id: userId, data: userData } of users) {
      // Skip if user is already properly formatted
      if (userData.userType && userData.status && userData.lastSeen) {
        continue;
      }

      // Fix user type field
      if (userData.user_type && !userData.userType) {
        updates[`users/${userId}/userType`] = userData.user_type;
      }

      // Fix dealer profiles
      if (userData.userType === 'dealer' || userData.user_type === 'dealer') {
        // Check if dealer code is missing or not 7 characters
        if (!userData.dealerCode || userData.dealerCode.length !== 7) {
          const dealerCode = await generateDealerCode();
          // Update user profile
          updates[`users/${userId}/dealerCode`] = dealerCode;
          
          // Create dealer code mapping
          updates[`dealerCodes/${dealerCode}`] = {
            dealerId: userId,
            dealerName: userData.name || userData.fullName,
            status: 'active',
            createdAt: new Date().toISOString()
          };
        }
      }

      // Ensure all required fields exist
      if (!userData.status) {
        updates[`users/${userId}/status`] = 'active';
      }
      if (!userData.lastSeen) {
        updates[`users/${userId}/lastSeen`] = new Date().toISOString();
      }
    }

    // Apply all updates
    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
      console.log('User profiles fixed successfully');
    } else {
      console.log('No updates needed');
    }
  } catch (error) {
    console.error('Error fixing user profiles:', error);
    throw error;
  }
};
