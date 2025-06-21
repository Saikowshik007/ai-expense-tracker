import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, User, PieChart, AlertCircle, TrendingDown, CreditCard, Calendar } from 'lucide-react';
import { ExpenseCalculatorService } from '../services/ExpenseCalculatorService';
import { CreditCardService } from '../services/CreditCardService';
import { StatCard, Card, Badge, Alert } from './UI';

/**
 * Enhanced Dashboard Component with Credit Card Integration
 * Displays financial overview including credit card debt and payments
 */
const Dashboard = ({ taxCalculations, expenses, creditCards = [] }) => {
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
                budgetRecommendations: { overall: [] },
                creditCardSummary: { totalDebt: 0, monthlyPayments: 0, utilization: 0 }
            };
        }

        const totalExpenses = ExpenseCalculatorService.calculateTotalExpenses(expenses);

        // Calculate credit card summary
        const creditCardSummary = CreditCardService.generateSummary(creditCards);

        // Include credit card minimum payments in total expenses
        const totalExpensesWithCreditCards = totalExpenses + creditCardSummary.monthlyPayments;

        const remainingBudget = ExpenseCalculatorService.calculateRemainingBudget(
            taxCalculations.monthlyNet,
            totalExpensesWithCreditCards
        );

        const expensesByCategory = ExpenseCalculatorService.getExpensesByCategory(expenses);

        // Add credit card payments as a category if there are any
        if (creditCardSummary.monthlyPayments > 0) {
            expensesByCategory['Credit Card Payments'] = creditCardSummary.monthlyPayments;
        }

        const expensesByType = ExpenseCalculatorService.getExpensesByType(expenses);

        const savingsInfo = ExpenseCalculatorService.calculateSavingsRate(
            taxCalculations.monthlyNet,
            totalExpensesWithCreditCards
        );

        const expenseTrends = ExpenseCalculatorService.calculateExpenseTrends(expenses, 6);
        const budgetRecommendations = ExpenseCalculatorService.generateBudgetRecommendations(
            taxCalculations.monthlyNet,
            expensesByCategory
        );

        return {
            totalExpenses: totalExpensesWithCreditCards,
            baseExpenses: totalExpenses, // Expenses without credit cards
            remainingBudget,
            expensesByCategory,
            expensesByType,
            savingsInfo,
            expenseTrends,
            budgetRecommendations,
            creditCardSummary
        };
    }, [taxCalculations, expenses, creditCards]);

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
     * Get utilization color
     */
    const getUtilizationColor = (utilization) => {
        if (utilization <= 30) return 'green';
        if (utilization <= 70) return 'yellow';
        return 'red';
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

                {/* Show credit card info even without paycheck */}
                {creditCards.length > 0 && (
                    <Card title="Credit Cards Overview">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Total Debt</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatCurrency(financialMetrics.creditCardSummary.totalDebt)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Monthly Payments</p>
                                    <p className="text-xl font-bold text-orange-600">
                                        {formatCurrency(financialMetrics.creditCardSummary.monthlyPayments)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Utilization</p>
                                    <p className={`text-xl font-bold text-${getUtilizationColor(financialMetrics.creditCardSummary.averageUtilization)}-600`}>
                                        {financialMetrics.creditCardSummary.averageUtilization}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    subtitle={`Base: ${formatCurrency(financialMetrics.baseExpenses)} + CC: ${formatCurrency(financialMetrics.creditCardSummary.monthlyPayments)}`}
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

                <StatCard
                    icon={CreditCard}
                    title="Credit Card Debt"
                    value={formatCurrency(financialMetrics.creditCardSummary.totalDebt)}
                    subtitle={`${financialMetrics.creditCardSummary.averageUtilization}% utilization`}
                    color={getUtilizationColor(financialMetrics.creditCardSummary.averageUtilization)}
                />
            </div>

            {/* Credit Card Alerts */}
            {financialMetrics.creditCardSummary.overdueCards.length > 0 && (
                <Alert type="error" title="Overdue Credit Card Payments">
                    You have {financialMetrics.creditCardSummary.overdueCards.length} overdue payment{financialMetrics.creditCardSummary.overdueCards.length !== 1 ? 's' : ''}.
                    Pay immediately to avoid late fees and credit score impact.
                </Alert>
            )}

            {financialMetrics.creditCardSummary.cardsDueSoon.length > 0 && (
                <Alert type="warning" title="Upcoming Credit Card Payments">
                    {financialMetrics.creditCardSummary.cardsDueSoon.length} payment{financialMetrics.creditCardSummary.cardsDueSoon.length !== 1 ? 's' : ''} due within 7 days.
                </Alert>
            )}

            {financialMetrics.creditCardSummary.averageUtilization > 80 && (
                <Alert type="warning" title="High Credit Utilization">
                    Your overall credit utilization is {financialMetrics.creditCardSummary.averageUtilization}%.
                    Consider paying down balances to improve your credit score.
                </Alert>
            )}

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

                        {/* Credit Card Impact */}
                        {financialMetrics.creditCardSummary.monthlyPayments > 0 && (
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-sm text-gray-600 mb-2">Credit Card Impact:</p>
                                <div className="text-xs text-gray-500">
                                    Without CC payments: {((financialMetrics.savingsInfo.monthlySavings + financialMetrics.creditCardSummary.monthlyPayments) / taxCalculations.monthlyNet * 100).toFixed(1)}% savings rate
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Credit Card Summary */}
                {creditCards.length > 0 && (
                    <Card title="Credit Cards Summary">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Total Debt</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatCurrency(financialMetrics.creditCardSummary.totalDebt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Available Credit</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(financialMetrics.creditCardSummary.totalCredit - financialMetrics.creditCardSummary.totalDebt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Monthly Payments</span>
                                <span className="font-medium">{formatCurrency(financialMetrics.creditCardSummary.monthlyPayments)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Monthly Interest</span>
                                <span className="font-medium text-red-600">{formatCurrency(financialMetrics.creditCardSummary.monthlyInterest)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Overall Utilization</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium">{financialMetrics.creditCardSummary.averageUtilization}%</span>
                                    <Badge variant={getUtilizationColor(financialMetrics.creditCardSummary.averageUtilization) === 'green' ? 'success' : getUtilizationColor(financialMetrics.creditCardSummary.averageUtilization) === 'yellow' ? 'warning' : 'error'}>
                                        {financialMetrics.creditCardSummary.averageUtilization <= 30 ? 'Good' : financialMetrics.creditCardSummary.averageUtilization <= 70 ? 'Fair' : 'High'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Utilization Progress Bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Credit Utilization</span>
                                    <span>{financialMetrics.creditCardSummary.averageUtilization}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                            financialMetrics.creditCardSummary.averageUtilization <= 30 ? 'bg-green-500' :
                                                financialMetrics.creditCardSummary.averageUtilization <= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, financialMetrics.creditCardSummary.averageUtilization)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Expense Breakdown by Category */}
                <Card title="Expenses by Category">
                    <div className="space-y-3">
                        {Object.entries(financialMetrics.expensesByCategory)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 8)
                            .map(([category, amount]) => {
                                const percentage = ((amount / financialMetrics.totalExpenses) * 100).toFixed(1);
                                const isCreditCard = category === 'Credit Card Payments';
                                return (
                                    <div key={category} className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            {isCreditCard && <CreditCard className="w-4 h-4 text-orange-600" />}
                                            <span className={`capitalize text-gray-600 ${isCreditCard ? 'font-medium' : ''}`}>
                                                {category}
                                            </span>
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

            {/* Credit Card Recommendations */}
            {financialMetrics.creditCardSummary.recommendations && financialMetrics.creditCardSummary.recommendations.length > 0 && (
                <Card title="Credit Card Recommendations">
                    <div className="space-y-3">
                        {financialMetrics.creditCardSummary.recommendations.map((recommendation, index) => (
                            <Alert
                                key={index}
                                type={recommendation.type === 'success' ? 'success' : recommendation.type === 'error' ? 'error' : recommendation.type === 'warning' ? 'warning' : 'info'}
                                title={recommendation.title}
                            >
                                {recommendation.message}
                            </Alert>
                        ))}
                    </div>
                </Card>
            )}

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
                  (financialMetrics.savingsInfo.savingsRate / 20) * 30 + // 30% weight for savings rate
                  (financialMetrics.remainingBudget > 0 ? 25 : 0) + // 25% weight for positive budget
                  (Object.keys(financialMetrics.expensesByCategory).length > 0 ? 15 : 0) + // 15% weight for expense tracking
                  (financialMetrics.creditCardSummary.averageUtilization <= 30 ? 20 : financialMetrics.creditCardSummary.averageUtilization <= 70 ? 10 : 0) + // 20% weight for credit utilization
                  10 // 10% base score for using the app
              )}
            </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {(() => {
                            const score = Math.round(
                                (financialMetrics.savingsInfo.savingsRate / 20) * 30 +
                                (financialMetrics.remainingBudget > 0 ? 25 : 0) +
                                (Object.keys(financialMetrics.expensesByCategory).length > 0 ? 15 : 0) +
                                (financialMetrics.creditCardSummary.averageUtilization <= 30 ? 20 : financialMetrics.creditCardSummary.averageUtilization <= 70 ? 10 : 0) +
                                10
                            );
                            if (score >= 80) return 'Excellent';
                            if (score >= 60) return 'Good';
                            if (score >= 40) return 'Fair';
                            return 'Needs Improvement';
                        })()}
                    </h3>
                    <p className="text-gray-600 text-sm">
                        Based on your savings rate, budget management, credit utilization, and expense tracking habits.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;