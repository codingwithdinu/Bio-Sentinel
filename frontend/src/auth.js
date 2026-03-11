// Import Firestore functions
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase'; // Make sure you export 'db' from your firebase initialization file

// User Roles
export const ROLES = {
    STUDENT: 'student',
    RESEARCHER: 'researcher',
    COMMUNITY: 'community',
};

// ==========================================
// API CALLS (Now using Firebase Firestore)
// ==========================================

// Fetch custom user profile data from Firestore
export const getUserProfile = async (uid) => {
    if (!uid) return null;
    
    try {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

// Update user profile in Firestore
// Note: We updated the signature to take 'uid' as the first parameter
export const updateUserProfile = async (uid, profileData) => {
    if (!uid) throw new Error('No UID provided');

    try {
        const userRef = doc(db, 'users', uid);
        
        // We use { merge: true } so we don't accidentally overwrite 
        // other fields if we only pass partial data
        await setDoc(userRef, {
            ...profileData,
            profileComplete: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { uid, ...profileData, profileComplete: true };
    } catch (error) {
        console.error("Error saving profile to Firestore:", error);
        throw new Error('Failed to update profile in database');
    }
};

// ==========================================
// UTILITY FUNCTIONS (Local logic)
// ==========================================

// Check if user profile is complete
export const isProfileComplete = (user) => {
    if (!user) return false;
    
    // Support data directly on user object, or nested under prefs
    const data = user.prefs || user;
    
    if (!data.profileComplete) return false;
    if (!data.role) return false;
    if (!data.country) return false;
    if (!data.bio) return false;
    
    // Check role-specific fields
    const role = data.role;
    if (role === ROLES.STUDENT) {
        return !!(data.college && data.course);
    } else if (role === ROLES.RESEARCHER) {
        return !!(data.organization && data.expertise);
    } else if (role === ROLES.COMMUNITY) {
        return !!(data.localArea);
    }
    return false;
};

// Get role-specific data
export const getRoleSpecificData = (user) => {
    if (!user) return null;
    
    const data = user.prefs || user;
    const { role, uid, createdAt, updatedAt, password, ...commonData } = data;
    
    const roleSpecificData = {
        [ROLES.STUDENT]: {
            college: data.college,
            course: data.course,
            year: data.year,
            interests: data.interests || [],
        },
        [ROLES.RESEARCHER]: {
            organization: data.organization,
            expertise: data.expertise,
            experience: data.experience,
            orcid: data.orcid,
        },
        [ROLES.COMMUNITY]: {
            localArea: data.localArea,
            occupation: data.occupation,
            onGroundAccess: data.onGroundAccess,
        },
    };
    
    return {
        role,
        ...commonData,
        ...(roleSpecificData[role] || {}),
    };
};

// Helper to get role emoji
export const getRoleEmoji = (role) => {
    const emojis = {
        [ROLES.STUDENT]: '🎓',
        [ROLES.RESEARCHER]: '🔬',
        [ROLES.COMMUNITY]: '🌱',
    };
    return emojis[role] || '👤';
};

// Helper to get role label
export const getRoleLabel = (role) => {
    const labels = {
        [ROLES.STUDENT]: 'Student',
        [ROLES.RESEARCHER]: 'Researcher',
        [ROLES.COMMUNITY]: 'Community',
    };
    return labels[role] || 'Unknown';
};

// Get dashboard path based on role
export const getDashboardPath = (role) => {
    const paths = {
        [ROLES.STUDENT]: '/dashboard/student',
        [ROLES.RESEARCHER]: '/dashboard/researcher',
        [ROLES.COMMUNITY]: '/dashboard/community',
    };
    return paths[role] || '/dashboard';
};

