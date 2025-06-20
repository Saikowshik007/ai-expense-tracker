import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, Card, Alert } from './UI';

/**
 * Authentication Form Component - Single Responsibility Principle
 * Handles user login and registration
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

    const { signIn, signUp, resetPassword, error: authError, clearError } = useAuth();

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
     * Handle form submission
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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

                {/* Form */}
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
                        disabled={isSubmitting}
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
                </div>
            </Card>
        </div>
    );
};

export default AuthForm;