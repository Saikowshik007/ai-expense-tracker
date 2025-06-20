import { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    deleteUser
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

/**
 * Custom Hook for Authentication - Interface Segregation Principle
 * Provides all authentication-related functionality including Google Auth
 */
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listen to authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                setUser(user);
                setLoading(false);
                setError(null);
            },
            (error) => {
                console.error('Auth state change error:', error);
                setError(error.message);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    // Check for redirect result on mount (for mobile Google sign-in)
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    // User signed in via redirect
                    console.log('Google sign-in redirect successful');
                }
            } catch (error) {
                console.error('Redirect result error:', error);
                setError(error.message);
            }
        };

        checkRedirectResult();
    }, []);

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<UserCredential>}
     */
    const signIn = useCallback(async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Sign in with Google (popup method)
     * @returns {Promise<UserCredential>}
     */
    const signInWithGoogle = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Try popup first (works better on desktop)
            const result = await signInWithPopup(auth, googleProvider);

            // Optional: Get additional user info
            // const credential = GoogleAuthProvider.credentialFromResult(result);
            // const token = credential.accessToken;

            return result;
        } catch (error) {
            console.error('Google sign-in error:', error);

            // Handle specific errors
            if (error.code === 'auth/popup-blocked') {
                setError('Popup was blocked. Please allow popups for this site or try again.');
            } else if (error.code === 'auth/popup-closed-by-user') {
                setError('Sign-in was cancelled. Please try again.');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // User cancelled, don't show error
                setError(null);
            } else {
                setError(error.message);
            }

            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Sign in with Google (redirect method - better for mobile)
     * @returns {Promise<void>}
     */
    const signInWithGoogleRedirect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await signInWithRedirect(auth, googleProvider);
            // Note: This will redirect the page, so the component will unmount
        } catch (error) {
            console.error('Google redirect sign-in error:', error);
            setError(error.message);
            setLoading(false);
            throw error;
        }
    }, []);

    /**
     * Create new user account with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} displayName - Optional display name
     * @returns {Promise<UserCredential>}
     */
    const signUp = useCallback(async (email, password, displayName = null) => {
        try {
            setLoading(true);
            setError(null);
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with display name if provided
            if (displayName && result.user) {
                await updateProfile(result.user, { displayName });
            }

            return result;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Sign out current user
     * @returns {Promise<void>}
     */
    const signOutUser = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await signOut(auth);
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Promise<void>}
     */
    const resetPassword = useCallback(async (email) => {
        try {
            setLoading(true);
            setError(null);
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Update user profile
     * @param {object} profileData - Profile data to update
     * @returns {Promise<void>}
     */
    const updateUserProfile = useCallback(async (profileData) => {
        if (!user) {
            throw new Error('No user logged in');
        }

        try {
            setLoading(true);
            setError(null);
            await updateProfile(user, profileData);
            // Trigger a re-render by updating the user state
            setUser({ ...user, ...profileData });
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Delete current user account
     * @returns {Promise<void>}
     */
    const deleteUserAccount = useCallback(async () => {
        if (!user) {
            throw new Error('No user logged in');
        }

        try {
            setLoading(true);
            setError(null);
            await deleteUser(user);
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Clear any existing errors
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    const isAuthenticated = useCallback(() => {
        return !!user;
    }, [user]);

    /**
     * Get user display name or email
     * @returns {string}
     */
    const getUserDisplayName = useCallback(() => {
        if (!user) return '';
        return user.displayName || user.email || 'User';
    }, [user]);

    /**
     * Get user ID
     * @returns {string|null}
     */
    const getUserId = useCallback(() => {
        return user?.uid || null;
    }, [user]);

    /**
     * Get user email
     * @returns {string|null}
     */
    const getUserEmail = useCallback(() => {
        return user?.email || null;
    }, [user]);

    /**
     * Check if user email is verified
     * @returns {boolean}
     */
    const isEmailVerified = useCallback(() => {
        return user?.emailVerified || false;
    }, [user]);

    /**
     * Check if user signed in with Google
     * @returns {boolean}
     */
    const isGoogleUser = useCallback(() => {
        return user?.providerData?.some(provider => provider.providerId === 'google.com') || false;
    }, [user]);

    /**
     * Get user photo URL
     * @returns {string|null}
     */
    const getUserPhotoURL = useCallback(() => {
        return user?.photoURL || null;
    }, [user]);

    return {
        // State
        user,
        loading,
        error,

        // Actions
        signIn,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signUp,
        signOutUser,
        resetPassword,
        updateUserProfile,
        deleteUserAccount,
        clearError,

        // Computed values
        isAuthenticated: isAuthenticated(),
        userDisplayName: getUserDisplayName(),
        userId: getUserId(),
        userEmail: getUserEmail(),
        isEmailVerified: isEmailVerified(),
        isGoogleUser: isGoogleUser(),
        userPhotoURL: getUserPhotoURL()
    };
};