import React, { useState } from 'react';
import { Key, Eye, EyeOff, Trash2, CheckCircle, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { useAuth } from '../hooks/useAuth';

/**
 * API Key Settings Component
 * Allows users to manage their OpenAI API keys securely
 */
const ApiKeySettings = () => {
    const { user } = useAuth();
    const {
        apiKeys,
        saveApiKey,
        deleteApiKey,
        deactivateApiKey,
        testApiKey,
        hasApiKey,
        loading,
        error,
        clearError
    } = useUserData(user);

    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        apiKey: '',
        label: 'Default'
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [testResults, setTestResults] = useState({});

    /**
     * Handle form input changes
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear field errors
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }

        // Clear general errors
        if (error) {
            clearError();
        }
    };

    /**
     * Validate form data
     */
    const validateForm = () => {
        const errors = {};

        if (!formData.apiKey) {
            errors.apiKey = 'API key is required';
        } else if (!formData.apiKey.startsWith('sk-')) {
            errors.apiKey = 'OpenAI API keys must start with "sk-"';
        } else if (formData.apiKey.length !== 51) {
            errors.apiKey = 'OpenAI API keys should be 51 characters long';
        }

        if (!formData.label || formData.label.trim().length < 1) {
            errors.label = 'Label is required';
        } else if (formData.label.trim().length > 50) {
            errors.label = 'Label must be less than 50 characters';
        }

        // Check if label already exists
        const existingKey = apiKeys.find(key =>
            key.label.toLowerCase() === formData.label.toLowerCase() && key.isActive
        );
        if (existingKey) {
            errors.label = 'A key with this label already exists';
        }

        return errors;
    };

    /**
     * Test API key validity
     */
    const handleTestKey = async () => {
        const errors = validateForm();
        if (errors.apiKey) {
            setFormErrors({ apiKey: errors.apiKey });
            return;
        }

        setIsTesting(true);
        setFormErrors({});

        try {
            const isValid = await testApiKey(formData.apiKey);
            setTestResults({
                ...testResults,
                [formData.apiKey]: isValid
            });
        } catch (error) {
            setFormErrors({ apiKey: 'Failed to test API key' });
        } finally {
            setIsTesting(false);
        }
    };

    /**
     * Handle form submission
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
            await saveApiKey(formData.apiKey.trim(), formData.label.trim());

            // Reset form
            setFormData({
                apiKey: '',
                label: 'Default'
            });
            setShowAddForm(false);
            setTestResults({});
        } catch (error) {
            // Error is handled by the hook
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle API key deletion
     */
    const handleDeleteKey = async (keyId, label) => {
        if (!window.confirm(`Are you sure you want to delete the API key "${label}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteApiKey(keyId);
        } catch (error) {
            console.error('Error deleting API key:', error);
        }
    };

    /**
     * Handle API key deactivation
     */
    const handleDeactivateKey = async (keyId, label) => {
        if (!window.confirm(`Are you sure you want to deactivate the API key "${label}"?`)) {
            return;
        }

        try {
            await deactivateApiKey(keyId);
        } catch (error) {
            console.error('Error deactivating API key:', error);
        }
    };

    /**
     * Get masked API key for display
     */
    const getMaskedKey = (maskedKey) => {
        return maskedKey || '••••••••••••••••';
    };

    /**
     * Format date for display
     */
    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Key className="w-6 h-6 text-indigo-600" />
                    API Key Settings
                </h2>
                <p className="text-gray-600 mt-2">
                    Manage your OpenAI API keys for financial insights and analysis.
                </p>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="text-blue-900 font-medium">Security Information</h3>
                        <p className="text-blue-700 text-sm mt-1">
                            Your API keys are encrypted and stored securely. They are only decrypted when needed to make requests to OpenAI.
                            We recommend creating a separate API key specifically for this application.
                        </p>
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mt-2"
                        >
                            Get your API key from OpenAI <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                        <button
                            onClick={clearError}
                            className="ml-auto text-red-600 hover:text-red-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Existing API Keys */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Your API Keys</h3>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Add API Key
                        </button>
                    )}
                </div>

                {apiKeys.length === 0 ? (
                    <div className="text-center py-8 border border-gray-200 rounded-lg">
                        <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No API keys configured</p>
                        <p className="text-gray-400 text-sm mt-1">Add an OpenAI API key to enable financial insights</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {apiKeys.map((key) => (
                            <div
                                key={key.id}
                                className={`border rounded-lg p-4 ${
                                    key.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-medium text-gray-900">{key.label}</h4>
                                            {key.isActive ? (
                                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm font-mono">
                                            {getMaskedKey(key.maskedKey)}
                                        </p>
                                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                                            <p>Created: {formatDate(key.createdAt)}</p>
                                            <p>Last used: {formatDate(key.lastUsed)}</p>
                                            <p>Usage count: {key.usageCount || 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {key.isActive && (
                                            <button
                                                onClick={() => handleDeactivateKey(key.id, key.label)}
                                                className="text-yellow-600 hover:text-yellow-700 p-2"
                                                title="Deactivate"
                                            >
                                                <EyeOff className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteKey(key.id, key.label)}
                                            className="text-red-600 hover:text-red-700 p-2"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add API Key Form */}
            {showAddForm && (
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Add New API Key</h3>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setFormData({ apiKey: '', label: 'Default' });
                                setFormErrors({});
                                setTestResults({});
                            }}
                            className="text-gray-600 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Label Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Label
                            </label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => handleInputChange('label', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                    formErrors.label ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Default, Personal, Business"
                                maxLength={50}
                            />
                            {formErrors.label && (
                                <p className="text-red-600 text-sm mt-1">{formErrors.label}</p>
                            )}
                        </div>

                        {/* API Key Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                OpenAI API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={formData.apiKey}
                                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                                    className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${
                                        formErrors.apiKey ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="sk-..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {formErrors.apiKey && (
                                <p className="text-red-600 text-sm mt-1">{formErrors.apiKey}</p>
                            )}

                            {/* Test Result */}
                            {testResults[formData.apiKey] !== undefined && (
                                <div className={`flex items-center gap-2 mt-2 text-sm ${
                                    testResults[formData.apiKey] ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {testResults[formData.apiKey] ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4" />
                                    )}
                                    {testResults[formData.apiKey] ? 'API key is valid' : 'API key is invalid'}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleTestKey}
                                disabled={!formData.apiKey || isTesting}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTesting ? 'Testing...' : 'Test Key'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || loading || !formData.apiKey}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : 'Save API Key'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Usage Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-yellow-900 font-medium mb-2">Important Notes</h4>
                <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Your API key is used to generate personalized financial insights</li>
                    <li>• OpenAI charges for API usage - monitor your usage on their platform</li>
                    <li>• You can revoke or regenerate your API key anytime on OpenAI's website</li>
                    <li>• Keep your API key secure and don't share it with others</li>
                </ul>
            </div>
        </div>
    );
};

export default ApiKeySettings;