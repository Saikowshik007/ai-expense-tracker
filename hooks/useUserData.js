import { useState, useEffect, useCallback } from 'react';
import { FirebaseService } from '../services/FirebaseService';
import { FORM_DEFAULTS } from '../constants';

/**
 * Custom Hook for User Data Management - Interface Segregation Principle
 * Handles all user-specific data operations (paycheck, expenses, etc.)
 */
export const useUserData = (user) => {
    const [paycheckData, setPaycheckData] = useState(FORM_DEFAULTS.PAYCHECK);
    const [expenses, setExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load all user data from Firebase
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

        // Utility actions
        clearError,
        refreshData,
        loadUserData
    };
};