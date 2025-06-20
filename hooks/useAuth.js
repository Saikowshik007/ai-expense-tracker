import { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    deleteUser
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Custom Hook for Authentication - Interface Segregation Principle
 * Provides all authentication-related functionality
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
     * Create new user account
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

    return {
        // State
        user,
        loading,
        error,

        // Actions
        signIn,
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
        isEmailVerified: isEmailVerified()
    };
};