import { useState, useEffect, useCallback } from 'react';
import { ChatGPTFinancialService } from '../services/ChatGPTFinancialService';
import { FirebaseService } from '../services/FirebaseService';

/**
 * Custom Hook for Financial Insights Management
 * Handles AI insights, settings, and caching
 */
export const useFinancialInsights = (user) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [settings, setSettings] = useState({
        openaiApiKey: '',
        autoAnalyze: false,
        includeGoals: true,
        lastAnalysisDate: null
    });

    /**
     * Validate user object
     * @param {object} user - User object to validate
     * @returns {boolean} True if user is valid
     */
    const isValidUser = useCallback((user) => {
        return user && user.uid && typeof user.uid === 'string' && user.uid.trim() !== '';
    }, []);

    /**
     * Clean object of undefined values for Firebase
     * @param {object} obj - Object to clean
     * @returns {object} Clean object without undefined values
     */
    const cleanUndefinedValues = useCallback((obj) => {
        if (obj === null || obj === undefined) {
            return {};
        }

        if (typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
            return obj;
        }

        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                if (value && typeof value === 'object' && value.constructor === Object) {
                    // Recursively clean nested objects
                    const cleanedNested = cleanUndefinedValues(value);
                    if (Object.keys(cleanedNested).length > 0) {
                        cleaned[key] = cleanedNested;
                    }
                } else {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    }, []);

    /**
     * Load user settings from Firebase
     */
    const loadSettings = useCallback(async () => {
        if (!isValidUser(user)) {
            console.warn('Invalid user, skipping settings load');
            return;
        }

        try {
            const userSettings = await FirebaseService.getUserDocuments('userSettings', user.uid);
            if (userSettings.length > 0) {
                // Clean undefined values from loaded settings
                const cleanedSettings = cleanUndefinedValues(userSettings[0]);
                setSettings(prev => ({
                    ...prev,
                    ...cleanedSettings
                }));
            }
        } catch (error) {
            console.error('Error loading insights settings:', error);
        }
    }, [user, isValidUser, cleanUndefinedValues]);

    /**
     * Save user settings to Firebase
     */
    const saveSettings = useCallback(async (newSettings) => {
        if (!isValidUser(user)) {
            throw new Error('User not authenticated');
        }

        try {
            // Get existing settings to preserve other user preferences
            const existingSettings = await FirebaseService.getUserDocuments('userSettings', user.uid);
            const existingId = existingSettings.length > 0 ? existingSettings[0].id : null;
            const existingData = existingSettings.length > 0 ? existingSettings[0] : {};

            // Clean existing data of undefined values
            const cleanExistingData = cleanUndefinedValues(existingData);

            const updatedSettings = {
                ...cleanExistingData,
                ...settings,
                ...newSettings,
                updatedAt: new Date()
            };

            // Clean the final settings object - this is crucial!
            const cleanUpdatedSettings = cleanUndefinedValues(updatedSettings);

            // Ensure no undefined values slip through
            const safeSettings = {
                ...cleanUpdatedSettings,
                // Explicitly handle potentially undefined fields
                openaiApiKey: cleanUpdatedSettings.openaiApiKey || '',
                autoAnalyze: cleanUpdatedSettings.autoAnalyze || false,
                includeGoals: cleanUpdatedSettings.includeGoals !== undefined ? cleanUpdatedSettings.includeGoals : true,
                lastAnalysisDate: cleanUpdatedSettings.lastAnalysisDate || null,
                updatedAt: new Date()
            };

            await FirebaseService.saveOrUpdateDocument(
                'userSettings',
                user.uid,
                safeSettings,
                existingId
            );

            setSettings(safeSettings);
            return safeSettings;
        } catch (error) {
            console.error('Error saving insights settings:', error);
            throw error;
        }
    }, [user, settings, isValidUser, cleanUndefinedValues]);

    /**
     * Load cached insights from Firebase
     */
    const loadCachedInsights = useCallback(async () => {
        if (!isValidUser(user)) {
            console.warn('Invalid user, skipping cached insights load');
            return;
        }

        try {
            const cachedInsights = await FirebaseService.getUserDocuments(
                'financialInsights',
                user.uid,
                'createdAt',
                'desc',
                1 // Get only the most recent
            );

            if (cachedInsights.length > 0) {
                const cached = cachedInsights[0];
                // Only use cached insights if they're less than 7 days old
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);

                if (new Date(cached.createdAt) > weekAgo) {
                    setInsights(cached);
                }
            }
        } catch (error) {
            console.error('Error loading cached insights:', error);
        }
    }, [user, isValidUser]);

    /**
     * Save insights to Firebase for caching
     */
    const cacheInsights = useCallback(async (insightsData) => {
        if (!isValidUser(user)) {
            console.warn('Invalid user, skipping insights caching');
            return;
        }

        try {
            // Clean the insights data before saving
            const cleanInsightsData = cleanUndefinedValues(insightsData);

            // Ensure required fields are present
            const safeInsightsData = {
                ...cleanInsightsData,
                cachedAt: new Date(),
                timestamp: cleanInsightsData.timestamp || new Date().toISOString(),
                insights: cleanInsightsData.insights || '',
                success: cleanInsightsData.success !== undefined ? cleanInsightsData.success : true
            };

            await FirebaseService.saveOrUpdateDocument(
                'financialInsights',
                user.uid,
                safeInsightsData
            );
        } catch (error) {
            console.error('Error caching insights:', error);
            // Don't throw - caching failure shouldn't break the feature
        }
    }, [user, isValidUser, cleanUndefinedValues]);

    /**
     * Get financial insights with caching
     */
    const getInsights = useCallback(async (params) => {
        const {
            paycheckData,
            expenses,
            creditCards,
            taxCalculations,
            focusArea = null,
            forceRefresh = false,
            useSample = false
        } = params;

        setLoading(true);
        setError(null);

        try {
            let result;

            // Check if we should use cached insights
            if (!forceRefresh && insights && !useSample) {
                const cacheAge = new Date() - new Date(insights.timestamp);
                const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

                if (cacheAge < maxCacheAge) {
                    setLoading(false);
                    return insights;
                }
            }

            if (useSample || !settings.openaiApiKey || !isValidUser(user)) {
                // Use sample insights
                const financialData = ChatGPTFinancialService.prepareFinancialData({
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations
                });
                result = ChatGPTFinancialService.generateSampleInsights(financialData);
            } else {
                // Use real ChatGPT API with user ID
                result = await ChatGPTFinancialService.getFinancialInsightsWithRetry({
                    userId: user.uid,
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations,
                    focusArea
                });

                // Cache the results if using real API
                await cacheInsights(result);
            }

            setInsights(result);

            // Update last analysis date in settings - with proper date handling
            if (settings.openaiApiKey && isValidUser(user)) {
                const currentDate = new Date().toISOString();
                await saveSettings({ lastAnalysisDate: currentDate });
            }

            return result;
        } catch (error) {
            console.error('Error getting financial insights:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [insights, settings.openaiApiKey, cacheInsights, saveSettings, user, isValidUser]);

    /**
     * Auto-analyze when data changes (if enabled)
     */
    const autoAnalyze = useCallback(async (financialData) => {
        if (!settings.autoAnalyze || !settings.openaiApiKey || loading || !isValidUser(user)) {
            return;
        }

        // Check if enough time has passed since last analysis (prevent too frequent calls)
        if (settings.lastAnalysisDate) {
            const lastAnalysis = new Date(settings.lastAnalysisDate);
            const hoursSinceLastAnalysis = (new Date() - lastAnalysis) / (1000 * 60 * 60);

            if (hoursSinceLastAnalysis < 6) { // Wait at least 6 hours between auto-analyses
                return;
            }
        }

        try {
            await getInsights({
                ...financialData,
                forceRefresh: true
            });
        } catch (error) {
            // Silently fail auto-analysis to not disrupt user experience
            console.error('Auto-analysis failed:', error);
        }
    }, [settings.autoAnalyze, settings.openaiApiKey, settings.lastAnalysisDate, loading, getInsights, user, isValidUser]);

    /**
     * Clear insights and cache
     */
    const clearInsights = useCallback(() => {
        setInsights(null);
        setError(null);
    }, []);

    /**
     * Get insights summary for quick overview
     */
    const getInsightsSummary = useCallback(() => {
        if (!insights?.structuredInsights) return null;

        return {
            healthScore: insights.structuredInsights.financialHealthScore,
            topPriority: insights.structuredInsights.priorityActions?.[0],
            hasDebtStrategy: !!insights.structuredInsights.debtStrategy,
            hasSavingsGoals: !!insights.structuredInsights.savingsGoals,
            lastUpdated: insights.timestamp,
            isStale: insights.timestamp && (new Date() - new Date(insights.timestamp)) > (24 * 60 * 60 * 1000)
        };
    }, [insights]);

    /**
     * Check if insights are available
     */
    const hasInsights = useCallback(() => {
        return !!insights?.insights;
    }, [insights]);

    /**
     * Check if API is configured
     */
    const isApiConfigured = useCallback(() => {
        return !!settings.openaiApiKey;
    }, [settings.openaiApiKey]);

    /**
     * Get usage statistics
     */
    const getUsageStats = useCallback(() => {
        if (!insights?.usage) return null;

        return {
            tokensUsed: insights.usage.total_tokens || 0,
            estimatedCost: (insights.usage.total_tokens || 0) * 0.0000015, // Rough estimate for GPT-4o-mini
            analysisDate: insights.timestamp
        };
    }, [insights]);

    // Load settings and cached insights on mount
    useEffect(() => {
        if (isValidUser(user)) {
            loadSettings();
            loadCachedInsights();
        } else {
            // Reset state when user becomes invalid
            setInsights(null);
            setError(null);
            setSettings({
                openaiApiKey: '',
                autoAnalyze: false,
                includeGoals: true,
                lastAnalysisDate: null
            });
        }
    }, [user, loadSettings, loadCachedInsights, isValidUser]);

    return {
        // State
        insights,
        loading,
        error,
        settings,

        // Actions
        getInsights,
        saveSettings,
        clearInsights,
        autoAnalyze,

        // Computed values
        insightsSummary: getInsightsSummary(),
        hasInsights: hasInsights(),
        isApiConfigured: isApiConfigured(),
        usageStats: getUsageStats(),

        // Utility functions
        loadCachedInsights,
        cacheInsights
    };
};