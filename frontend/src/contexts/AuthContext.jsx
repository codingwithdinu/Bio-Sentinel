import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase'; // Update this path to where your initialized Firebase auth lives

// Assuming you still have these utility functions for your business logic
import { 
    isProfileComplete as checkProfileComplete,
    updateUserProfile, // You'll likely update this to write to Firestore
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
                // NOTE: Firebase Auth only returns basic data (uid, email, displayName).
                // If you have roles or custom data, you will fetch it from your database here.
                // Example: const dbUser = await fetchUserFromFirestore(firebaseUser.uid);
                // const mergedUser = { ...firebaseUser, ...dbUser };
                
                setUser(firebaseUser);
                setProfileComplete(checkProfileComplete(firebaseUser));
            } else {
                setUser(null);
                setProfileComplete(false);
            }
            setLoading(false); // Stop the loading spinner once we know the auth state
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
            // Firebase doesn't take 'name' in the standard creation function.
            // You can update the Firebase profile or save the name to your database here.
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