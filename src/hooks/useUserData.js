import { useState, useEffect, useCallback } from 'react';
import { FirebaseService } from '../services/FirebaseService';
import { FORM_DEFAULTS } from '../constants';

/**
 * Enhanced Custom Hook for User Data Management with API Key Support
 * Handles all user-specific data operations including OpenAI API keys
 */
export const useUserData = (user) => {
    const [paycheckData, setPaycheckData] = useState(FORM_DEFAULTS.PAYCHECK);
    const [expenses, setExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load all user data from Firebase including API keys
     */
    const loadUserData = useCallback(async () => {
        if (!user?.uid) return;

        setLoading(true);
        setError(null);

        try {
            // Load paycheck data
            const paychecks = await FirebaseService.getUserDocuments('paychecks', user.uid);
            if (paychecks.length > 0) {
                setPaycheckData({
                    ...FORM_DEFAULTS.PAYCHECK,
                    ...paychecks[0]
                });
            }

            // Load expenses (last 12 months)
            const expensesData = await FirebaseService.getUserDocuments(
                'expenses',
                user.uid,
                'date',
                'desc',
                500 // Limit to last 500 expenses
            );
            setExpenses(expensesData);

            // Load budgets
            const budgetsData = await FirebaseService.getUserDocuments(
                'budgets',
                user.uid,
                'createdAt',
                'desc'
            );
            setBudgets(budgetsData);

            // Load API keys (masked for display)
            const apiKeysData = await FirebaseService.getUserApiKeys(user.uid);
            setApiKeys(apiKeysData);

        } catch (error) {
            console.error('Error loading user data:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Load user data when user changes
     */
    useEffect(() => {
        if (user?.uid) {
            loadUserData();
        } else {
            // Reset data when user logs out
            setPaycheckData(FORM_DEFAULTS.PAYCHECK);
            setExpenses([]);
            setBudgets([]);
            setApiKeys([]);
        }
    }, [user?.uid, loadUserData]);

    /**
     * Save or update paycheck information
     * @param {object} data - Paycheck data
     * @returns {Promise<void>}
     */
    const savePaycheckData = useCallback(async (data) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            // Check if paycheck data already exists
            const existingPaychecks = await FirebaseService.getUserDocuments('paychecks', user.uid);
            const existingId = existingPaychecks.length > 0 ? existingPaychecks[0].id : null;

            const processedData = {
                ...data,
                grossSalary: parseFloat(data.grossSalary) || 0
            };

            await FirebaseService.saveOrUpdateDocument(
                'paychecks',
                user.uid,
                processedData,
                existingId
            );

            setPaycheckData(processedData);
        } catch (error) {
            console.error('Error saving paycheck data:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Save or update an expense
     * @param {object} expenseData - Expense data
     * @param {string|null} existingId - ID of existing expense to update
     * @returns {Promise<void>}
     */
    const saveExpense = useCallback(async (expenseData, existingId = null) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            const processedData = {
                ...expenseData,
                amount: parseFloat(expenseData.amount) || 0,
                date: new Date(expenseData.date)
            };

            await FirebaseService.saveOrUpdateDocument(
                'expenses',
                user.uid,
                processedData,
                existingId
            );

            // Refresh expenses data
            await loadUserData();
        } catch (error) {
            console.error('Error saving expense:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid, loadUserData]);

    /**
     * Delete an expense
     * @param {string} expenseId - ID of expense to delete
     * @returns {Promise<void>}
     */
    const deleteExpense = useCallback(async (expenseId) => {
        try {
            setLoading(true);
            setError(null);

            await FirebaseService.deleteDocument('expenses', expenseId);

            // Update local state by removing the deleted expense
            setExpenses(prevExpenses =>
                prevExpenses.filter(expense => expense.id !== expenseId)
            );
        } catch (error) {
            console.error('Error deleting expense:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Batch delete multiple expenses
     * @param {Array<string>} expenseIds - Array of expense IDs to delete
     * @returns {Promise<void>}
     */
    const batchDeleteExpenses = useCallback(async (expenseIds) => {
        try {
            setLoading(true);
            setError(null);

            await FirebaseService.batchDeleteDocuments('expenses', expenseIds);

            // Update local state by removing deleted expenses
            setExpenses(prevExpenses =>
                prevExpenses.filter(expense => !expenseIds.includes(expense.id))
            );
        } catch (error) {
            console.error('Error batch deleting expenses:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Get expenses within a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Filtered expenses
     */
    const getExpensesByDateRange = useCallback(async (startDate, endDate) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            const filteredExpenses = await FirebaseService.getDocumentsByDateRange(
                'expenses',
                user.uid,
                startDate,
                endDate,
                'date'
            );

            return filteredExpenses;
        } catch (error) {
            console.error('Error fetching expenses by date range:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Search expenses by category
     * @param {string} category - Category to search for
     * @returns {Array} Filtered expenses
     */
    const getExpensesByCategory = useCallback((category) => {
        return expenses.filter(expense => expense.category === category);
    }, [expenses]);

    /**
     * Search expenses by type
     * @param {string} type - Type to search for (fixed, recurring, one-time)
     * @returns {Array} Filtered expenses
     */
    const getExpensesByType = useCallback((type) => {
        return expenses.filter(expense => expense.type === type);
    }, [expenses]);

    /**
     * Save or update a budget
     * @param {object} budgetData - Budget data
     * @param {string|null} existingId - ID of existing budget to update
     * @returns {Promise<void>}
     */
    const saveBudget = useCallback(async (budgetData, existingId = null) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            await FirebaseService.saveOrUpdateDocument(
                'budgets',
                user.uid,
                budgetData,
                existingId
            );

            // Refresh budgets data
            const budgetsData = await FirebaseService.getUserDocuments(
                'budgets',
                user.uid,
                'createdAt',
                'desc'
            );
            setBudgets(budgetsData);
        } catch (error) {
            console.error('Error saving budget:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Delete a budget
     * @param {string} budgetId - ID of budget to delete
     * @returns {Promise<void>}
     */
    const deleteBudget = useCallback(async (budgetId) => {
        try {
            setLoading(true);
            setError(null);

            await FirebaseService.deleteDocument('budgets', budgetId);

            // Update local state
            setBudgets(prevBudgets =>
                prevBudgets.filter(budget => budget.id !== budgetId)
            );
        } catch (error) {
            console.error('Error deleting budget:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================
    // API KEY MANAGEMENT METHODS
    // ============================================

    /**
     * Save or update OpenAI API key
     * @param {string} apiKey - OpenAI API key
     * @param {string} label - Label for the API key
     * @returns {Promise<void>}
     */
    const saveApiKey = useCallback(async (apiKey, label = 'Default') => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            // Optionally test the API key
            const isValid = await FirebaseService.testApiKey(apiKey);
            if (!isValid) {
                throw new Error('API key appears to be invalid. Please check your key and try again.');
            }

            await FirebaseService.saveApiKey(user.uid, apiKey, label);

            // Refresh API keys data
            const apiKeysData = await FirebaseService.getUserApiKeys(user.uid);
            setApiKeys(apiKeysData);

        } catch (error) {
            console.error('Error saving API key:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Get decrypted OpenAI API key
     * @param {string} label - API key label
     * @returns {Promise<string|null>} Decrypted API key
     */
    const getApiKey = useCallback(async (label = 'Default') => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            return await FirebaseService.getApiKey(user.uid, label);
        } catch (error) {
            console.error('Error retrieving API key:', error);
            setError(error.message);
            throw error;
        }
    }, [user?.uid]);

    /**
     * Delete an API key
     * @param {string} keyId - API key document ID
     * @returns {Promise<void>}
     */
    const deleteApiKey = useCallback(async (keyId) => {
        try {
            setLoading(true);
            setError(null);

            await FirebaseService.deleteApiKey(keyId);

            // Update local state
            setApiKeys(prevKeys => prevKeys.filter(key => key.id !== keyId));
        } catch (error) {
            console.error('Error deleting API key:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Deactivate an API key (soft delete)
     * @param {string} keyId - API key document ID
     * @returns {Promise<void>}
     */
    const deactivateApiKey = useCallback(async (keyId) => {
        try {
            setLoading(true);
            setError(null);

            await FirebaseService.deactivateApiKey(keyId);

            // Update local state
            setApiKeys(prevKeys =>
                prevKeys.map(key =>
                    key.id === keyId ? { ...key, isActive: false } : key
                )
            );
        } catch (error) {
            console.error('Error deactivating API key:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Check if user has a valid API key
     * @returns {boolean} True if user has an active API key
     */
    const hasApiKey = useCallback(() => {
        return apiKeys.some(key => key.isActive);
    }, [apiKeys]);

    /**
     * Get the default API key info (without decrypting)
     * @returns {object|null} API key info or null
     */
    const getDefaultApiKeyInfo = useCallback(() => {
        return apiKeys.find(key => key.label === 'Default' && key.isActive) || null;
    }, [apiKeys]);

    /**
     * Validate and test an API key without saving
     * @param {string} apiKey - API key to test
     * @returns {Promise<boolean>} True if valid
     */
    const testApiKey = useCallback(async (apiKey) => {
        try {
            setLoading(true);
            setError(null);

            if (!FirebaseService.validateOpenAIApiKey(apiKey)) {
                throw new Error('Invalid API key format');
            }

            const isValid = await FirebaseService.testApiKey(apiKey);
            if (!isValid) {
                throw new Error('API key is not valid');
            }

            return true;
        } catch (error) {
            console.error('Error testing API key:', error);
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Clear any existing errors
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Refresh all user data
     */
    const refreshData = useCallback(async () => {
        await loadUserData();
    }, [loadUserData]);

    return {
        // State
        paycheckData,
        expenses,
        budgets,
        apiKeys,
        loading,
        error,

        // Paycheck actions
        savePaycheckData,

        // Expense actions
        saveExpense,
        deleteExpense,
        batchDeleteExpenses,
        getExpensesByDateRange,
        getExpensesByCategory,
        getExpensesByType,

        // Budget actions
        saveBudget,
        deleteBudget,

        // API Key actions
        saveApiKey,
        getApiKey,
        deleteApiKey,
        deactivateApiKey,
        testApiKey,
        hasApiKey,
        getDefaultApiKeyInfo,

        // Utility actions
        clearError,
        refreshData,
        loadUserData
    };
};