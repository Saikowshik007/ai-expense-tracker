import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, Card, Alert } from './UI';
import Footer from './Footer';

/**
 * Google Icon Component
 */
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

/**
 * Authentication Form Component - Single Responsibility Principle
 * Handles user login, registration, and Google authentication
 */
const AuthForm = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const {
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleRedirect,
        resetPassword,
        error: authError,
        clearError
    } = useAuth();

    /**
     * Validate form data
     * @returns {object} Validation errors
     */
    const validateForm = () => {
        const errors = {};

        // Email validation
        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters long';
        }

        // Confirm password validation (only for signup)
        if (!isLogin) {
            if (!formData.confirmPassword) {
                errors.confirmPassword = 'Please confirm your password';
            } else if (formData.password !== formData.confirmPassword) {
                errors.confirmPassword = 'Passwords do not match';
            }

            // Display name validation (optional for signup)
            if (formData.displayName && formData.displayName.length < 2) {
                errors.displayName = 'Display name must be at least 2 characters long';
            }
        }

        return errors;
    };

    /**
     * Handle form input changes
     * @param {string} field - Field name
     * @param {string} value - Field value
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear field error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }

        // Clear auth error when user makes changes
        if (authError) {
            clearError();
        }
    };

    /**
     * Handle email/password form submission
     * @param {Event} e - Form submit event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        setFormErrors({});

        try {
            if (isLogin) {
                await signIn(formData.email, formData.password);
            } else {
                await signUp(formData.email, formData.password, formData.displayName || null);
            }
        } catch (error) {
            // Error is handled by the useAuth hook
            console.error('Authentication error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle Google sign-in
     */
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        clearError();

        try {
            // Try popup method first (better UX on desktop)
            await signInWithGoogle();
        } catch (error) {
            console.error('Google sign-in error:', error);

            // If popup fails, try redirect method (better for mobile)
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                try {
                    await signInWithGoogleRedirect();
                } catch (redirectError) {
                    console.error('Google redirect sign-in error:', redirectError);
                }
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    /**
     * Handle password reset
     */
    const handlePasswordReset = async () => {
        if (!formData.email) {
            setFormErrors({ email: 'Please enter your email address first' });
            return;
        }

        try {
            await resetPassword(formData.email);
            alert('Password reset email sent! Check your inbox.');
        } catch (error) {
            console.error('Password reset error:', error);
        }
    };

    /**
     * Toggle between login and signup forms
     */
    const toggleMode = () => {
        setIsLogin(!isLogin);
        setFormErrors({});
        setFormData({
            email: formData.email, // Keep email when switching
            password: '',
            confirmPassword: '',
            displayName: ''
        });
        clearError();
    };

    /**
     * Detect if user is on mobile device
     */
    const isMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Calculator className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
                        <p className="text-gray-600 mt-2">
                            {isLogin ? 'Welcome back!' : 'Create your account'}
                        </p>
                    </div>

                    {/* Auth Error Alert */}
                    {authError && (
                        <Alert type="error" className="mb-6" onClose={clearError}>
                            {authError}
                        </Alert>
                    )}

                    {/* Google Sign-In Button */}
                    <div className="mb-6">
                        <Button
                            type="button"
                            variant="outline"
                            fullWidth
                            onClick={handleGoogleSignIn}
                            loading={isGoogleLoading}
                            disabled={isGoogleLoading || isSubmitting}
                            className="border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                            icon={!isGoogleLoading && <GoogleIcon />}
                        >
                            {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <Input
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            error={formErrors.email}
                            placeholder="Enter your email"
                            required
                        />

                        {/* Display Name Input (Signup only) */}
                        {!isLogin && (
                            <Input
                                label="Display Name (Optional)"
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => handleInputChange('displayName', e.target.value)}
                                error={formErrors.displayName}
                                placeholder="How should we call you?"
                            />
                        )}

                        {/* Password Input */}
                        <Input
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            error={formErrors.password}
                            placeholder="Enter your password"
                            required
                        />

                        {/* Confirm Password Input (Signup only) */}
                        {!isLogin && (
                            <Input
                                label="Confirm Password"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                error={formErrors.confirmPassword}
                                placeholder="Confirm your password"
                                required
                            />
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            disabled={isSubmitting || isGoogleLoading}
                            fullWidth
                            className="mt-6"
                        >
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </Button>
                    </form>

                    {/* Password Reset Link (Login only) */}
                    {isLogin && (
                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={handlePasswordReset}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                disabled={isSubmitting || isGoogleLoading}
                            >
                                Forgot your password?
                            </button>
                        </div>
                    )}

                    {/* Toggle Mode */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-indigo-600 hover:text-indigo-700 font-medium"
                            disabled={isSubmitting || isGoogleLoading}
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Sign in'
                            }
                        </button>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center text-xs text-gray-500">
                        <p>
                            By {isLogin ? 'signing in' : 'creating an account'}, you agree to our Terms of Service and Privacy Policy.
                        </p>
                        {isMobile() && (
                            <p className="mt-2">
                                On mobile? The Google sign-in may redirect to complete authentication.
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default AuthForm;