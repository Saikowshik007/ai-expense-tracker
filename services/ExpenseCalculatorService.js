/**
 * Expense Calculator Service - Single Responsibility Principle
 * Handles all expense-related calculations and analytics
 */
export class ExpenseCalculatorService {
    /**
     * Calculate total expenses from an array of expense objects
     * @param {Array} expenses - Array of expense objects
     * @returns {number} Total expense amount
     */
    static calculateTotalExpenses(expenses) {
        return expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
    }

    /**
     * Group expenses by category and calculate totals
     * @param {Array} expenses - Array of expense objects
     * @returns {object} Object with categories as keys and totals as values
     */
    static getExpensesByCategory(expenses) {
        return expenses.reduce((categories, expense) => {
            const category = expense.category || 'other';
            categories[category] = (categories[category] || 0) + (expense.amount || 0);
            return categories;
        }, {});
    }

    /**
     * Calculate remaining budget after expenses
     * @param {number} monthlyIncome - Monthly net income
     * @param {number} totalExpenses - Total monthly expenses
     * @returns {number} Remaining budget
     */
    static calculateRemainingBudget(monthlyIncome, totalExpenses) {
        return monthlyIncome - totalExpenses;
    }

    /**
     * Calculate expenses by type (fixed, recurring, one-time)
     * @param {Array} expenses - Array of expense objects
     * @returns {object} Object with expense types and their totals
     */
    static getExpensesByType(expenses) {
        return expenses.reduce((types, expense) => {
            const type = expense.type || 'other';
            types[type] = (types[type] || 0) + (expense.amount || 0);
            return types;
        }, {});
    }

    /**
     * Calculate monthly expenses from different frequency types
     * @param {Array} expenses - Array of expense objects
     * @returns {number} Total monthly equivalent expenses
     */
    static calculateMonthlyEquivalent(expenses) {
        return expenses.reduce((monthly, expense) => {
            const amount = expense.amount || 0;

            switch (expense.frequency || 'monthly') {
                case 'weekly':
                    return monthly + (amount * 52 / 12); // 52 weeks per year / 12 months
                case 'bi-weekly':
                    return monthly + (amount * 26 / 12); // 26 bi-weekly periods per year / 12 months
                case 'monthly':
                    return monthly + amount;
                case 'quarterly':
                    return monthly + (amount / 3); // Every 3 months
                case 'semi-annual':
                    return monthly + (amount / 6); // Every 6 months
                case 'annual':
                    return monthly + (amount / 12); // Once per year / 12 months
                case 'one-time':
                    return monthly + 0; // Don't include one-time expenses in monthly calculations
                default:
                    return monthly + amount;
            }
        }, 0);
    }

    /**
     * Calculate expense trends over time
     * @param {Array} expenses - Array of expense objects with dates
     * @param {number} months - Number of months to analyze
     * @returns {Array} Array of monthly expense totals
     */
    static calculateExpenseTrends(expenses, months = 6) {
        const now = new Date();
        const trends = [];

        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

            const monthlyExpenses = expenses.filter(expense => {
                const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
                return expenseDate >= targetDate && expenseDate <= monthEnd;
            });

            trends.push({
                month: targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                total: this.calculateTotalExpenses(monthlyExpenses),
                count: monthlyExpenses.length
            });
        }

        return trends;
    }

    /**
     * Calculate budget allocation percentages
     * @param {number} monthlyIncome - Monthly net income
     * @param {object} expensesByCategory - Expenses grouped by category
     * @returns {object} Budget allocation percentages by category
     */
    static calculateBudgetAllocation(monthlyIncome, expensesByCategory) {
        if (monthlyIncome <= 0) return {};

        const allocation = {};
        for (const [category, amount] of Object.entries(expensesByCategory)) {
            allocation[category] = {
                amount,
                percentage: (amount / monthlyIncome) * 100
            };
        }

        return allocation;
    }

    /**
     * Identify high-spending categories
     * @param {object} expensesByCategory - Expenses grouped by category
     * @param {number} threshold - Threshold percentage (default 15%)
     * @returns {Array} Array of categories exceeding threshold
     */
    static identifyHighSpendingCategories(expensesByCategory, threshold = 15) {
        const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

        return Object.entries(expensesByCategory)
            .filter(([category, amount]) => (amount / totalExpenses) * 100 > threshold)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / totalExpenses) * 100
            }))
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Calculate savings rate
     * @param {number} monthlyIncome - Monthly net income
     * @param {number} totalExpenses - Total monthly expenses
     * @returns {object} Savings information
     */
    static calculateSavingsRate(monthlyIncome, totalExpenses) {
        const savings = monthlyIncome - totalExpenses;
        const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

        return {
            monthlySavings: savings,
            savingsRate,
            annualSavings: savings * 12,
            status: this.getSavingsStatus(savingsRate)
        };
    }

    /**
     * Get savings status based on savings rate
     * @param {number} savingsRate - Savings rate percentage
     * @returns {string} Savings status
     */
    static getSavingsStatus(savingsRate) {
        if (savingsRate >= 20) return 'excellent';
        if (savingsRate >= 15) return 'good';
        if (savingsRate >= 10) return 'fair';
        if (savingsRate >= 5) return 'poor';
        return 'critical';
    }

    /**
     * Generate budget recommendations
     * @param {number} monthlyIncome - Monthly net income
     * @param {object} expensesByCategory - Expenses grouped by category
     * @returns {object} Budget recommendations
     */
    static generateBudgetRecommendations(monthlyIncome, expensesByCategory) {
        const recommendations = {
            categories: {},
            overall: []
        };

        // 50/30/20 rule recommendations
        const recommendedAllocations = {
            housing: 0.30,
            transportation: 0.15,
            food: 0.10,
            utilities: 0.05,
            entertainment: 0.05,
            shopping: 0.05,
            healthcare: 0.05,
            insurance: 0.05,
            savings: 0.20
        };

        // Check each category against recommendations
        for (const [category, recommendedPercentage] of Object.entries(recommendedAllocations)) {
            const currentAmount = expensesByCategory[category] || 0;
            const currentPercentage = (currentAmount / monthlyIncome) * 100;
            const recommendedAmount = monthlyIncome * recommendedPercentage;

            recommendations.categories[category] = {
                current: currentAmount,
                recommended: recommendedAmount,
                difference: recommendedAmount - currentAmount,
                status: currentAmount > recommendedAmount ? 'over' : 'under'
            };
        }

        // Overall recommendations
        const totalExpenses = this.calculateTotalExpenses(Object.values(expensesByCategory));
        const savingsInfo = this.calculateSavingsRate(monthlyIncome, totalExpenses);

        if (savingsInfo.savingsRate < 10) {
            recommendations.overall.push('Consider reducing discretionary spending to increase savings rate');
        }

        const highSpendingCategories = this.identifyHighSpendingCategories(expensesByCategory, 20);
        if (highSpendingCategories.length > 0) {
            recommendations.overall.push(`Review spending in: ${highSpendingCategories.map(c => c.category).join(', ')}`);
        }

        return recommendations;
    }

    /**
     * Calculate expense variance from budget
     * @param {object} actualExpenses - Actual expenses by category
     * @param {object} budgetedExpenses - Budgeted expenses by category
     * @returns {object} Variance analysis
     */
    static calculateExpenseVariance(actualExpenses, budgetedExpenses) {
        const variance = {};

        const allCategories = new Set([
            ...Object.keys(actualExpenses),
            ...Object.keys(budgetedExpenses)
        ]);

        for (const category of allCategories) {
            const actual = actualExpenses[category] || 0;
            const budgeted = budgetedExpenses[category] || 0;
            const difference = actual - budgeted;
            const percentageVariance = budgeted > 0 ? (difference / budgeted) * 100 : 0;

            variance[category] = {
                actual,
                budgeted,
                difference,
                percentageVariance,
                status: difference > 0 ? 'over' : difference < 0 ? 'under' : 'on-track'
            };
        }

        return variance;
    }
}