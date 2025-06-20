import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, User, PieChart, AlertCircle, TrendingDown } from 'lucide-react';
import { ExpenseCalculatorService } from '../services/ExpenseCalculatorService';
import { StatCard, Card, Badge, Alert } from './UI';

/**
 * Dashboard Component - Single Responsibility Principle
 * Displays financial overview and key metrics
 */
const Dashboard = ({ taxCalculations, expenses }) => {
    // Memoized calculations to avoid recalculation on every render
    const financialMetrics = useMemo(() => {
        if (!taxCalculations || !expenses) {
            return {
                totalExpenses: 0,
                remainingBudget: 0,
                expensesByCategory: {},
                expensesByType: {},
                savingsInfo: { savingsRate: 0, monthlySavings: 0, status: 'critical' },
                expenseTrends: [],
                budgetRecommendations: { overall: [] }
            };
        }

        const totalExpenses = ExpenseCalculatorService.calculateTotalExpenses(expenses);
        const remainingBudget = ExpenseCalculatorService.calculateRemainingBudget(
            taxCalculations.monthlyNet,
            totalExpenses
        );
        const expensesByCategory = ExpenseCalculatorService.getExpensesByCategory(expenses);
        const expensesByType = ExpenseCalculatorService.getExpensesByType(expenses);
        const savingsInfo = ExpenseCalculatorService.calculateSavingsRate(
            taxCalculations.monthlyNet,
            totalExpenses
        );
        const expenseTrends = ExpenseCalculatorService.calculateExpenseTrends(expenses, 6);
        const budgetRecommendations = ExpenseCalculatorService.generateBudgetRecommendations(
            taxCalculations.monthlyNet,
            expensesByCategory
        );

        return {
            totalExpenses,
            remainingBudget,
            expensesByCategory,
            expensesByType,
            savingsInfo,
            expenseTrends,
            budgetRecommendations
        };
    }, [taxCalculations, expenses]);

    /**
     * Get status color based on savings rate
     */
    const getSavingsStatusColor = (status) => {
        const colors = {
            excellent: 'success',
            good: 'info',
            fair: 'warning',
            poor: 'warning',
            critical: 'error'
        };
        return colors[status] || 'info';
    };

    /**
     * Get budget status color
     */
    const getBudgetStatusColor = (remaining) => {
        if (remaining < 0) return 'red';
        if (remaining < 500) return 'yellow';
        return 'green';
    };

    /**
     * Format currency
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    /**
     * Calculate trend direction
     */
    const getTrendDirection = () => {
        if (financialMetrics.expenseTrends.length < 2) return null;

        const current = financialMetrics.expenseTrends[financialMetrics.expenseTrends.length - 1];
        const previous = financialMetrics.expenseTrends[financialMetrics.expenseTrends.length - 2];

        if (current.total > previous.total) return 'up';
        if (current.total < previous.total) return 'down';
        return 'stable';
    };

    // Show setup message if no paycheck data
    if (!taxCalculations) {
        return (
            <div className="space-y-6">
                <Alert type="info" title="Get Started">
                    Please configure your paycheck information in the Paycheck tab to see your financial dashboard.
                </Alert>

                {expenses.length > 0 && (
                    <Card title="Your Expenses">
                        <p className="text-gray-600 mb-4">
                            You have {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded.
                        </p>
                        <div className="space-y-2">
                            {Object.entries(financialMetrics.expensesByCategory).map(([category, amount]) => (
                                <div key={category} className="flex justify-between items-center">
                                    <span className="capitalize text-gray-600">{category}</span>
                                    <span className="font-medium">{formatCurrency(amount)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    const trendDirection = getTrendDirection();

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={DollarSign}
                    title="Monthly Net Income"
                    value={formatCurrency(taxCalculations.monthlyNet)}
                    color="green"
                />

                <StatCard
                    icon={TrendingUp}
                    title="Monthly Expenses"
                    value={formatCurrency(financialMetrics.totalExpenses)}
                    change={trendDirection === 'up' ? '↑ vs last month' : trendDirection === 'down' ? '↓ vs last month' : null}
                    changeType={trendDirection === 'up' ? 'negative' : trendDirection === 'down' ? 'positive' : 'neutral'}
                    color="blue"
                />

                <StatCard
                    icon={User}
                    title="Remaining Budget"
                    value={formatCurrency(financialMetrics.remainingBudget)}
                    color={getBudgetStatusColor(financialMetrics.remainingBudget)}
                />
            </div>

            {/* Savings Rate Alert */}
            {financialMetrics.savingsInfo.savingsRate < 10 && (
                <Alert type="warning" title="Low Savings Rate">
                    Your current savings rate is {financialMetrics.savingsInfo.savingsRate.toFixed(1)}%.
                    Consider reducing expenses to reach the recommended 20% savings rate.
                </Alert>
            )}

            {/* Budget Deficit Alert */}
            {financialMetrics.remainingBudget < 0 && (
                <Alert type="error" title="Budget Deficit">
                    You are overspending by {formatCurrency(Math.abs(financialMetrics.remainingBudget))} per month.
                    Review your expenses to get back on track.
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Savings Overview */}
                <Card title="Savings Overview">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Monthly Savings</span>
                            <span className="font-medium text-lg">
                {formatCurrency(financialMetrics.savingsInfo.monthlySavings)}
              </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Savings Rate</span>
                            <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {financialMetrics.savingsInfo.savingsRate.toFixed(1)}%
                </span>
                                <Badge variant={getSavingsStatusColor(financialMetrics.savingsInfo.status)}>
                                    {financialMetrics.savingsInfo.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Annual Savings</span>
                            <span className="font-medium">
                {formatCurrency(financialMetrics.savingsInfo.annualSavings)}
              </span>
                        </div>

                        {/* Savings Rate Progress Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress to 20% target</span>
                                <span>{Math.min(100, (financialMetrics.savingsInfo.savingsRate / 20) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, (financialMetrics.savingsInfo.savingsRate / 20) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Expense Breakdown by Category */}
                <Card title="Expenses by Category">
                    <div className="space-y-3">
                        {Object.entries(financialMetrics.expensesByCategory)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 6)
                            .map(([category, amount]) => {
                                const percentage = ((amount / financialMetrics.totalExpenses) * 100).toFixed(1);
                                return (
                                    <div key={category} className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <span className="capitalize text-gray-600">{category}</span>
                                            <Badge variant="default" size="sm">
                                                {percentage}%
                                            </Badge>
                                        </div>
                                        <span className="font-medium">{formatCurrency(amount)}</span>
                                    </div>
                                );
                            })}

                        {Object.keys(financialMetrics.expensesByCategory).length === 0 && (
                            <p className="text-gray-500 text-center py-4">
                                No expenses recorded yet. Add some expenses to see the breakdown.
                            </p>
                        )}
                    </div>
                </Card>

                {/* Expense Type Breakdown */}
                <Card title="Expenses by Type">
                    <div className="space-y-3">
                        {Object.entries(financialMetrics.expensesByType).map(([type, amount]) => {
                            const percentage = ((amount / financialMetrics.totalExpenses) * 100).toFixed(1);
                            return (
                                <div key={type} className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <span className="capitalize text-gray-600">{type.replace('_', ' ')}</span>
                                        <Badge variant="default" size="sm">
                                            {percentage}%
                                        </Badge>
                                    </div>
                                    <span className="font-medium">{formatCurrency(amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Monthly Trends */}
                <Card title="Expense Trends (Last 6 Months)">
                    <div className="space-y-3">
                        {financialMetrics.expenseTrends.map((trend, index) => {
                            const isCurrentMonth = index === financialMetrics.expenseTrends.length - 1;
                            const previousTrend = index > 0 ? financialMetrics.expenseTrends[index - 1] : null;
                            const change = previousTrend ? trend.total - previousTrend.total : 0;

                            return (
                                <div key={trend.month} className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                    <span className={`text-gray-600 ${isCurrentMonth ? 'font-medium' : ''}`}>
                      {trend.month}
                    </span>
                                        {change !== 0 && (
                                            <span className={`text-sm ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {change > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(change))}
                      </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                    <span className={`font-medium ${isCurrentMonth ? 'text-indigo-600' : ''}`}>
                      {formatCurrency(trend.total)}
                    </span>
                                        <Badge variant="default" size="sm">
                                            {trend.count} items
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}

                        {financialMetrics.expenseTrends.length === 0 && (
                            <p className="text-gray-500 text-center py-4">
                                Add more expenses over time to see trends.
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Budget Recommendations */}
            {financialMetrics.budgetRecommendations.overall.length > 0 && (
                <Card title="Budget Recommendations">
                    <div className="space-y-3">
                        {financialMetrics.budgetRecommendations.overall.map((recommendation, index) => (
                            <Alert key={index} type="info">
                                {recommendation}
                            </Alert>
                        ))}
                    </div>
                </Card>
            )}

            {/* Financial Health Score */}
            <Card title="Financial Health Score">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 mb-4">
            <span className="text-2xl font-bold text-indigo-600">
              {Math.round(
                  (financialMetrics.savingsInfo.savingsRate / 20) * 40 + // 40% weight for savings rate
                  (financialMetrics.remainingBudget > 0 ? 30 : 0) + // 30% weight for positive budget
                  (Object.keys(financialMetrics.expensesByCategory).length > 0 ? 20 : 0) + // 20% weight for expense tracking
                  10 // 10% base score for using the app
              )}
            </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {(() => {
                            const score = Math.round(
                                (financialMetrics.savingsInfo.savingsRate / 20) * 40 +
                                (financialMetrics.remainingBudget > 0 ? 30 : 0) +
                                (Object.keys(financialMetrics.expensesByCategory).length > 0 ? 20 : 0) +
                                10
                            );
                            if (score >= 80) return 'Excellent';
                            if (score >= 60) return 'Good';
                            if (score >= 40) return 'Fair';
                            return 'Needs Improvement';
                        })()}
                    </h3>
                    <p className="text-gray-600 text-sm">
                        Based on your savings rate, budget management, and expense tracking habits.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;