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
     * Load user settings from Firebase
     */
    const loadSettings = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const userSettings = await FirebaseService.getUserDocuments('userSettings', user.uid);
            if (userSettings.length > 0) {
                setSettings(prev => ({
                    ...prev,
                    ...userSettings[0]
                }));
            }
        } catch (error) {
            console.error('Error loading insights settings:', error);
        }
    }, [user?.uid]);

    /**
     * Save user settings to Firebase
     */
    const saveSettings = useCallback(async (newSettings) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            // Get existing settings to preserve other user preferences
            const existingSettings = await FirebaseService.getUserDocuments('userSettings', user.uid);
            const existingId = existingSettings.length > 0 ? existingSettings[0].id : null;

            const updatedSettings = {
                ...settings,
                ...newSettings,
                updatedAt: new Date()
            };

            await FirebaseService.saveOrUpdateDocument(
                'userSettings',
                user.uid,
                updatedSettings,
                existingId
            );

            setSettings(updatedSettings);
            return updatedSettings;
        } catch (error) {
            console.error('Error saving insights settings:', error);
            throw error;
        }
    }, [user?.uid, settings]);

    /**
     * Load cached insights from Firebase
     */
    const loadCachedInsights = useCallback(async () => {
        if (!user?.uid) return;

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
    }, [user?.uid]);

    /**
     * Save insights to Firebase for caching
     */
    const cacheInsights = useCallback(async (insightsData) => {
        if (!user?.uid) return;

        try {
            await FirebaseService.saveOrUpdateDocument(
                'financialInsights',
                user.uid,
                {
                    ...insightsData,
                    cachedAt: new Date()
                }
            );
        } catch (error) {
            console.error('Error caching insights:', error);
            // Don't throw - caching failure shouldn't break the feature
        }
    }, [user?.uid]);

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

            if (useSample || !settings.openaiApiKey) {
                // Use sample insights
                const financialData = ChatGPTFinancialService.prepareFinancialData({
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations
                });
                result = ChatGPTFinancialService.generateSampleInsights(financialData);
            } else {
                // Use real ChatGPT API
                result = await ChatGPTFinancialService.getFinancialInsightsWithRetry({
                    apiKey: settings.openaiApiKey,
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

            // Update last analysis date in settings
            if (settings.openaiApiKey) {
                await saveSettings({ lastAnalysisDate: new Date().toISOString() });
            }

            return result;
        } catch (error) {
            console.error('Error getting financial insights:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [insights, settings.openaiApiKey, cacheInsights, saveSettings]);

    /**
     * Auto-analyze when data changes (if enabled)
     */
    const autoAnalyze = useCallback(async (financialData) => {
        if (!settings.autoAnalyze || !settings.openaiApiKey || loading) {
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
    }, [settings.autoAnalyze, settings.openaiApiKey, settings.lastAnalysisDate, loading, getInsights]);

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
        if (user?.uid) {
            loadSettings();
            loadCachedInsights();
        }
    }, [user?.uid, loadSettings, loadCachedInsights]);

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