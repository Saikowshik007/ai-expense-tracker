import { ExpenseCalculatorService } from './ExpenseCalculatorService';
import { CreditCardService } from './CreditCardService';
import { TaxCalculatorService } from './TaxCalculatorService';
import { FirebaseService } from './FirebaseService';

/**
 * Enhanced ChatGPT Financial Insights Service with Firebase API Key Integration
 * Prepares financial data and communicates with ChatGPT API using stored user API keys
 */
export class ChatGPTFinancialService {
    static API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    /**
     * Prepare financial data for ChatGPT analysis
     * @param {Object} params - Financial data parameters
     * @param {Object} params.paycheckData - Paycheck/tax information
     * @param {Array} params.expenses - User expenses
     * @param {Array} params.creditCards - Credit card data
     * @param {Object} params.taxCalculations - Tax calculations
     * @returns {Object} Structured financial data for ChatGPT
     */
    static prepareFinancialData({ paycheckData, expenses, creditCards, taxCalculations }) {
        // Calculate expense metrics
        const totalExpenses = ExpenseCalculatorService.calculateTotalExpenses(expenses);
        const expensesByCategory = ExpenseCalculatorService.getExpensesByCategory(expenses);
        const expensesByType = ExpenseCalculatorService.getExpensesByType(expenses);
        const savingsInfo = taxCalculations ?
            ExpenseCalculatorService.calculateSavingsRate(taxCalculations.monthlyNet, totalExpenses) :
            null;

        // Calculate credit card metrics
        const creditCardSummary = CreditCardService.generateSummary(creditCards);
        const debtRatios = CreditCardService.calculateDebtRatios(creditCards);

        // Prepare anonymized data for ChatGPT
        const financialSnapshot = {
            income: {
                monthlyGross: taxCalculations?.monthlyGross || 0,
                monthlyNet: taxCalculations?.monthlyNet || 0,
                effectiveTaxRate: taxCalculations?.effectiveTotalRate || 0,
                state: paycheckData?.state || 'Unknown',
                filingStatus: paycheckData?.filingStatus || 'single'
            },
            expenses: {
                total: totalExpenses,
                categories: expensesByCategory,
                types: expensesByType,
                monthlyTrends: ExpenseCalculatorService.calculateExpenseTrends(expenses, 6)
            },
            creditCards: {
                cardCount: creditCards.length,
                totalDebt: debtRatios.totalDebt,
                totalCreditLimit: debtRatios.totalCredit,
                utilization: debtRatios.utilization,
                monthlyPayments: creditCardSummary.monthlyPayments,
                monthlyInterest: creditCardSummary.monthlyInterest,
                cardsDueSoon: creditCardSummary.cardsDueSoon.length,
                overdueCards: creditCardSummary.overdueCards.length,
                averageInterestRate: this.calculateAverageInterestRate(creditCards)
            },
            savings: savingsInfo || {
                monthlySavings: 0,
                savingsRate: 0,
                status: 'unknown'
            },
            financialHealth: {
                budgetStatus: savingsInfo ? (savingsInfo.monthlySavings > 0 ? 'surplus' : 'deficit') : 'unknown',
                debtToIncomeRatio: taxCalculations ? (debtRatios.totalDebt / taxCalculations.monthlyNet) * 100 : 0,
                emergencyFundMonths: 0 // Could be calculated if emergency fund data is available
            }
        };

        return financialSnapshot;
    }

    /**
     * Calculate average interest rate across credit cards
     * @param {Array} creditCards - Credit card data
     * @returns {number} Average interest rate
     */
    static calculateAverageInterestRate(creditCards) {
        if (!creditCards.length) return 0;

        const totalWeightedRate = creditCards.reduce((sum, card) => {
            const balance = parseFloat(card.currentBalance) || 0;
            const rate = parseFloat(card.interestRate) || 0;
            return sum + (balance * rate);
        }, 0);

        const totalBalance = creditCards.reduce((sum, card) =>
            sum + (parseFloat(card.currentBalance) || 0), 0
        );

        return totalBalance > 0 ? totalWeightedRate / totalBalance : 0;
    }

    /**
     * Generate ChatGPT prompt for financial analysis
     * @param {Object} financialData - Prepared financial data
     * @param {string} focusArea - Specific area to focus on (optional)
     * @returns {string} ChatGPT prompt
     */
    static generateFinancialPrompt(financialData, focusArea = null) {
        const prompt = `
As a certified financial advisor, analyze this person's financial situation and provide specific, actionable insights to improve their financial health:

**FINANCIAL SNAPSHOT:**
- Monthly Net Income: $${financialData.income.monthlyNet.toLocaleString()}
- Monthly Expenses: $${financialData.expenses.total.toLocaleString()}
- Monthly Savings: $${financialData.savings.monthlySavings.toLocaleString()}
- Savings Rate: ${financialData.savings.savingsRate.toFixed(1)}%

**EXPENSE BREAKDOWN:**
${Object.entries(financialData.expenses.categories)
            .map(([category, amount]) => `- ${category}: $${amount.toLocaleString()}`)
            .join('\n')}

**CREDIT CARD DEBT:**
- Total Debt: $${financialData.creditCards.totalDebt.toLocaleString()}
- Credit Utilization: ${financialData.creditCards.utilization.toFixed(1)}%
- Monthly Credit Payments: $${financialData.creditCards.monthlyPayments.toLocaleString()}
- Monthly Interest Charges: $${financialData.creditCards.monthlyInterest.toLocaleString()}
- Average Interest Rate: ${financialData.creditCards.averageInterestRate.toFixed(1)}%

**KEY METRICS:**
- Debt-to-Income Ratio: ${financialData.financialHealth.debtToIncomeRatio.toFixed(1)}%
- Budget Status: ${financialData.financialHealth.budgetStatus}
- Cards Due Soon: ${financialData.creditCards.cardsDueSoon}
- Overdue Cards: ${financialData.creditCards.overdueCards}

${focusArea ? `**FOCUS AREA:** Please pay special attention to: ${focusArea}` : ''}

**REQUESTED ANALYSIS:**
1. **Financial Health Score** (1-10 with explanation)
2. **Top 3 Priority Actions** (specific steps to take immediately)
3. **Expense Optimization** (which categories to reduce and by how much)
4. **Debt Strategy** (specific plan for credit card debt if applicable)
5. **Savings Goals** (realistic targets and timeline)
6. **Risk Assessment** (potential financial vulnerabilities)

Please provide concrete, actionable advice with specific dollar amounts and timelines where possible. Focus on practical steps that can be implemented immediately.
        `.trim();

        return prompt;
    }

    /**
     * Get user's API key from Firebase
     * @param {string} userId - User ID
     * @param {string} label - API key label (default: 'Default')
     * @returns {Promise<string>} API key
     */
    static async getUserApiKey(userId, label = 'Default') {
        try {
            const apiKey = await FirebaseService.getApiKey(userId, label);
            if (!apiKey) {
                throw new Error('No API key found. Please add an OpenAI API key in your settings.');
            }
            return apiKey;
        } catch (error) {
            console.error('Error retrieving user API key:', error);
            throw new Error(`Failed to retrieve API key: ${error.message}`);
        }
    }

    /**
     * Call ChatGPT API for financial insights using stored user API key
     * @param {string} userId - User ID to retrieve API key
     * @param {Object} financialData - Prepared financial data
     * @param {string} focusArea - Optional focus area
     * @param {string} apiKeyLabel - API key label to use (default: 'Default')
     * @returns {Promise<Object>} ChatGPT response with insights
     */
    static async getFinancialInsights(userId, financialData, focusArea = null, apiKeyLabel = 'Default') {
        try {
            // Get user's API key from Firebase
            const apiKey = await this.getUserApiKey(userId, apiKeyLabel);

            const prompt = this.generateFinancialPrompt(financialData, focusArea);

            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Cost-effective model good for analysis
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a certified financial advisor with expertise in personal finance, debt management, and wealth building. Provide specific, actionable advice based on the financial data provided.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`ChatGPT API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                insights: data.choices[0].message.content,
                usage: data.usage,
                timestamp: new Date().toISOString(),
                financialData: financialData, // Include the data used for analysis
                apiKeyLabel: apiKeyLabel
            };
        } catch (error) {
            console.error('Error calling ChatGPT API:', error);
            throw error;
        }
    }

    /**
     * Call ChatGPT API with explicit API key (legacy method for backward compatibility)
     * @param {string} apiKey - OpenAI API key
     * @param {Object} financialData - Prepared financial data
     * @param {string} focusArea - Optional focus area
     * @returns {Promise<Object>} ChatGPT response with insights
     */
    static async getFinancialInsightsWithApiKey(apiKey, financialData, focusArea = null) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }

        const prompt = this.generateFinancialPrompt(financialData, focusArea);

        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a certified financial advisor with expertise in personal finance, debt management, and wealth building. Provide specific, actionable advice based on the financial data provided.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`ChatGPT API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                insights: data.choices[0].message.content,
                usage: data.usage,
                timestamp: new Date().toISOString(),
                financialData: financialData
            };
        } catch (error) {
            console.error('Error calling ChatGPT API:', error);
            throw error;
        }
    }

    /**
     * Parse and structure ChatGPT insights response
     * @param {string} insightsText - Raw ChatGPT response
     * @returns {Object} Structured insights
     */
    static parseInsights(insightsText) {
        const insights = {
            rawText: insightsText,
            financialHealthScore: null,
            priorityActions: [],
            expenseOptimization: [],
            debtStrategy: '',
            savingsGoals: '',
            riskAssessment: '',
            sections: {}
        };

        try {
            // Extract financial health score
            const scoreMatch = insightsText.match(/(?:score|rating).*?(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)/i);
            if (scoreMatch) {
                insights.financialHealthScore = parseFloat(scoreMatch[1]);
            }

            // Split into sections for easier parsing
            const sections = insightsText.split(/\*\*([^*]+)\*\*/);
            for (let i = 1; i < sections.length; i += 2) {
                const sectionTitle = sections[i].trim().toLowerCase();
                const sectionContent = sections[i + 1]?.trim() || '';
                insights.sections[sectionTitle] = sectionContent;
            }

            // Extract priority actions
            const prioritySection = insights.sections['top 3 priority actions'] ||
                insights.sections['priority actions'] || '';

            if (prioritySection) {
                const actions = prioritySection.split(/\d+\./).filter(action => action.trim());
                insights.priorityActions = actions.map(action => action.trim());
            }

            return insights;
        } catch (error) {
            console.error('Error parsing insights:', error);
            return insights; // Return basic structure even if parsing fails
        }
    }

    /**
     * Get financial insights with error handling and retry logic using stored API key
     * @param {Object} params - Parameters
     * @param {string} params.userId - User ID to retrieve API key
     * @param {Object} params.paycheckData - Paycheck data
     * @param {Array} params.expenses - Expenses
     * @param {Array} params.creditCards - Credit cards
     * @param {Object} params.taxCalculations - Tax calculations
     * @param {string} params.focusArea - Optional focus area
     * @param {string} params.apiKeyLabel - API key label to use (default: 'Default')
     * @param {number} params.retries - Number of retries (default: 2)
     * @returns {Promise<Object>} Structured insights
     */
    static async getFinancialInsightsWithRetry(params, retries = 2) {
        const { userId, paycheckData, expenses, creditCards, taxCalculations, focusArea, apiKeyLabel = 'Default' } = params;

        // Prepare financial data
        const financialData = this.prepareFinancialData({
            paycheckData,
            expenses,
            creditCards,
            taxCalculations
        });

        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await this.getFinancialInsights(userId, financialData, focusArea, apiKeyLabel);
                const structuredInsights = this.parseInsights(response.insights);

                return {
                    ...response,
                    structuredInsights,
                    attempt: attempt + 1
                };
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt + 1} failed:`, error.message);

                if (attempt < retries) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError;
    }

    /**
     * Get financial insights with explicit API key and retry logic (legacy method)
     * @param {Object} params - Parameters
     * @param {string} params.apiKey - OpenAI API key
     * @param {Object} params.paycheckData - Paycheck data
     * @param {Array} params.expenses - Expenses
     * @param {Array} params.creditCards - Credit cards
     * @param {Object} params.taxCalculations - Tax calculations
     * @param {string} params.focusArea - Optional focus area
     * @param {number} params.retries - Number of retries (default: 2)
     * @returns {Promise<Object>} Structured insights
     */
    static async getFinancialInsightsWithApiKeyAndRetry(params, retries = 2) {
        const { apiKey, paycheckData, expenses, creditCards, taxCalculations, focusArea } = params;

        // Prepare financial data
        const financialData = this.prepareFinancialData({
            paycheckData,
            expenses,
            creditCards,
            taxCalculations
        });

        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await this.getFinancialInsightsWithApiKey(apiKey, financialData, focusArea);
                const structuredInsights = this.parseInsights(response.insights);

                return {
                    ...response,
                    structuredInsights,
                    attempt: attempt + 1
                };
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt + 1} failed:`, error.message);

                if (attempt < retries) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError;
    }

    /**
     * Check if user has a valid API key configured
     * @param {string} userId - User ID
     * @param {string} apiKeyLabel - API key label to check (default: 'Default')
     * @returns {Promise<boolean>} True if user has a valid API key
     */
    static async hasValidApiKey(userId, apiKeyLabel = 'Default') {
        try {
            const apiKey = await FirebaseService.getApiKey(userId, apiKeyLabel);
            return !!apiKey;
        } catch (error) {
            console.error('Error checking API key:', error);
            return false;
        }
    }

    /**
     * Generate sample insights for testing/demo purposes when no API key is available
     * @param {Object} financialData - Financial data
     * @returns {Object} Sample insights
     */
    static generateSampleInsights(financialData) {
        const savingsRate = financialData.savings.savingsRate;
        const utilization = financialData.creditCards.utilization;
        const debtToIncome = financialData.financialHealth.debtToIncomeRatio;

        let score = 7; // Base score
        if (savingsRate < 10) score -= 2;
        if (utilization > 70) score -= 2;
        if (debtToIncome > 36) score -= 1;
        if (financialData.creditCards.overdueCards > 0) score -= 2;

        score = Math.max(1, Math.min(10, score));

        return {
            success: true,
            insights: `**Financial Health Score:** ${score}/10\n\n**Top 3 Priority Actions:**\n1. Build emergency fund\n2. Pay down high-interest debt\n3. Optimize expense categories\n\n**Expense Optimization:**\nConsider reducing discretionary spending by 10-15%.\n\n**Debt Strategy:**\nFocus on highest interest rate cards first.\n\n**Savings Goals:**\nAim for 20% savings rate within 12 months.`,
            structuredInsights: {
                financialHealthScore: score,
                priorityActions: [
                    'Build emergency fund',
                    'Pay down high-interest debt',
                    'Optimize expense categories'
                ],
                expenseOptimization: ['Reduce discretionary spending by 10-15%'],
                debtStrategy: 'Focus on highest interest rate cards first',
                savingsGoals: 'Aim for 20% savings rate within 12 months'
            },
            usage: { total_tokens: 0 },
            timestamp: new Date().toISOString(),
            financialData: financialData,
            isSample: true
        };
    }

    /**
     * Get insights with fallback to sample data if no API key is available
     * @param {Object} params - Parameters (same as getFinancialInsightsWithRetry)
     * @returns {Promise<Object>} Insights or sample data
     */
    static async getFinancialInsightsWithFallback(params) {
        try {
            // Try to get real insights first
            return await this.getFinancialInsightsWithRetry(params);
        } catch (error) {
            console.warn('Failed to get AI insights, falling back to sample data:', error.message);

            // Prepare financial data for sample insights
            const financialData = this.prepareFinancialData({
                paycheckData: params.paycheckData,
                expenses: params.expenses,
                creditCards: params.creditCards,
                taxCalculations: params.taxCalculations
            });

            // Return sample insights
            return this.generateSampleInsights(financialData);
        }
    }
}