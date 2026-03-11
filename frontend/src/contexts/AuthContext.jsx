import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth } from '../firebase'; // Update this path to where your initialized Firebase auth lives

// Assuming you still have these utility functions for your business logic
import { 
    isProfileComplete as checkProfileComplete,
    updateUserProfile,
    getUserProfile,
    getRoleSpecificData,
    getDashboardPath,
    getRoleEmoji,
    getRoleLabel,
    ROLES
} from '../auth'; 

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileComplete, setProfileComplete] = useState(false);

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch custom profile from Firestore and merge with Firebase Auth user
                const firestoreProfile = await getUserProfile(firebaseUser.uid);
                const mergedUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    ...(firestoreProfile || {})
                };
                setUser(mergedUser);
                setProfileComplete(checkProfileComplete(mergedUser));
            } else {
                setUser(null);
                setProfileComplete(false);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const value = {
        user,
        loading,
        profileComplete,
        isLoggedIn: () => !!user,
        
        signInWithEmail: (email, password) => {
            return signInWithEmailAndPassword(auth, email, password);
        },
        
        signUpWithEmail: async (name, email, password) => {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                await updateFirebaseProfile(userCredential.user, { displayName: name });
            }
            return userCredential.user;
        },

        signInWithGoogle: () => {
            const provider = new GoogleAuthProvider();
            return signInWithPopup(auth, provider);
        },
        
        logOut: () => {
            return signOut(auth);
        },
        
        updateProfile: async (profileData) => {
            // FIX: Use auth.currentUser directly to avoid stale React state closures
            const currentUser = auth.currentUser;
            
            if (!currentUser) {
                throw new Error('No active user session found. Please log in again.');
            }
            
            // Pass the verified current user's uid to your database save function
            const updatedUser = await updateUserProfile(currentUser.uid, profileData);
            
            // Instantly update the local context state so the app knows the profile is done
            setUser(prev => ({ ...prev, ...updatedUser }));
            
            // Re-evaluate if the profile is complete based on the new data
            // (Or hardcode to true if completing this form guarantees it)
            setProfileComplete(true); 
            
            return updatedUser;
        },

        // Custom business logic
        getRoleSpecificData: () => getRoleSpecificData(user),
        getDashboardPath: () => user?.role ? getDashboardPath(user.role) : '/dashboard',
        getRoleEmoji: (role) => getRoleEmoji(role),
        getRoleLabel: (role) => getRoleLabel(role),
        ROLES,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-bg-dark">
                    <div className="text-white/50 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm">Loading...</span>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export default AuthContext;