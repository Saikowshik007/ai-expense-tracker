import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Enhanced Credit Card Service with Due Date Management
 * Handles all credit card related business logic and Firebase operations
 */
export class CreditCardService {
    static COLLECTION_NAME = 'creditCards';

    /**
     * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
     * @param {number} day - Day number
     * @returns {string} Ordinal suffix
     */
    static getOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    /**
     * Calculate next due date based on due date type
     * @param {Object} card - Credit card data
     * @param {Date} referenceDate - Reference date (default: today)
     * @returns {Date} Next due date
     */
    static calculateNextDueDate(card, referenceDate = new Date()) {
        const {
            dueDateType = 'fixed', // 'fixed', 'floating', 'statement_based', 'manual'
            dueDateDay,             // Day of month (1-31) for fixed dates
            daysAfterStatement,     // Days after statement for floating dates
            statementDate,          // Statement date for statement-based
            dueDate                // Current/original due date
        } = card;

        const today = new Date(referenceDate);
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        switch (dueDateType) {
            case 'fixed':
                // Fixed day each month (most common)
                const dayOfMonth = dueDateDay || new Date(dueDate).getDate();
                let nextDue = new Date(currentYear, currentMonth, dayOfMonth);

                // If this month's due date has passed, move to next month
                if (nextDue <= today) {
                    nextDue = new Date(currentYear, currentMonth + 1, dayOfMonth);
                }

                // Handle months with fewer days (e.g., Feb 30th -> Feb 28th)
                if (nextDue.getDate() !== dayOfMonth) {
                    nextDue = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0); // Last day of month
                }

                return nextDue;

            case 'floating':
                // X days after statement date
                if (!statementDate || !daysAfterStatement) {
                    return new Date(dueDate); // Fallback to original
                }

                const statementDay = new Date(statementDate).getDate();
                let statementThisMonth = new Date(currentYear, currentMonth, statementDay);

                // If this month's statement has passed, use next month's statement
                if (statementThisMonth <= today) {
                    statementThisMonth = new Date(currentYear, currentMonth + 1, statementDay);
                }

                const floatingDue = new Date(statementThisMonth);
                floatingDue.setDate(floatingDue.getDate() + parseInt(daysAfterStatement));
                return floatingDue;

            case 'statement_based':
                // Due on specific day relative to statement (e.g., 25 days after statement)
                return this.calculateNextDueDate({
                    ...card,
                    dueDateType: 'floating'
                }, referenceDate);

            default:
                // Default to original due date (manual)
                return new Date(dueDate);
        }
    }

    /**
     * Check if due date needs updating and update if necessary
     * @param {Object} card - Credit card data
     * @returns {Object} Updated card data if changes were made
     */
    static updateDueDateIfNeeded(card) {
        if (!card.dueDate || card.dueDateType === 'manual') {
            return card; // Don't auto-update manual due dates
        }

        const currentDueDate = new Date(card.dueDate);
        const today = new Date();

        // If due date is in the past and it's a recurring type, calculate next due date
        if (currentDueDate < today && ['fixed', 'floating', 'statement_based'].includes(card.dueDateType)) {
            const nextDueDate = this.calculateNextDueDate(card);

            return {
                ...card,
                dueDate: nextDueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                lastDueDateUpdate: new Date().toISOString()
            };
        }

        return card;
    }

    /**
     * Get days until due date (enhanced version)
     * @param {Object} card - Credit card data
     * @returns {Object} Due date information
     */
    static getDueDateInfo(card) {
        if (!card.dueDate) {
            return {
                daysUntilDue: null,
                status: 'no_date',
                nextDueDate: null,
                color: 'text-gray-500'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate day calculation

        const dueDate = new Date(card.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate - today;
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status, color;

        if (daysUntilDue < 0) {
            status = 'overdue';
            color = 'text-red-600';
        } else if (daysUntilDue === 0) {
            status = 'due_today';
            color = 'text-red-600';
        } else if (daysUntilDue <= 3) {
            status = 'due_soon';
            color = 'text-orange-600';
        } else if (daysUntilDue <= 7) {
            status = 'due_this_week';
            color = 'text-yellow-600';
        } else {
            status = 'due_later';
            color = 'text-green-600';
        }

        return {
            daysUntilDue,
            status,
            nextDueDate: dueDate,
            color,
            isOverdue: daysUntilDue < 0,
            isDueToday: daysUntilDue === 0,
            isDueSoon: daysUntilDue <= 3 && daysUntilDue >= 0
        };
    }

    /**
     * Save credit card with enhanced due date handling
     * @param {string} userId - User ID
     * @param {Object} cardData - Credit card data
     * @returns {Promise<string>} Document ID
     */
    static async saveCreditCard(userId, cardData) {
        try {
            // Process due date information
            const processedCard = {
                ...cardData,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                dueDateType: cardData.dueDateType || 'fixed',
                id: null // Will be set after creation
            };

            // Calculate next due date if it's a recurring type
            if (processedCard.dueDateType !== 'manual' && processedCard.dueDate) {
                const updatedCard = this.updateDueDateIfNeeded(processedCard);
                Object.assign(processedCard, updatedCard);
            }

            const docRef = await addDoc(
                collection(db, this.COLLECTION_NAME),
                processedCard
            );

            // Update with the document ID
            await updateDoc(docRef, { id: docRef.id });

            console.log('Credit card saved with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error saving credit card:', error);
            throw new Error('Failed to save credit card');
        }
    }

    /**
     * Update credit card with due date processing
     * @param {string} cardId - Card ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<void>}
     */
    static async updateCreditCard(cardId, updateData) {
        try {
            const processedUpdate = {
                ...updateData,
                updatedAt: new Date()
            };

            // Process due date if it's being updated
            if (updateData.dueDate || updateData.dueDateType) {
                const cardWithUpdate = { ...updateData };
                const updatedCard = this.updateDueDateIfNeeded(cardWithUpdate);
                Object.assign(processedUpdate, updatedCard);
            }

            const cardDoc = doc(db, this.COLLECTION_NAME, cardId);
            await updateDoc(cardDoc, processedUpdate);

            console.log('Credit card updated:', cardId);
        } catch (error) {
            console.error('Error updating credit card:', error);
            throw new Error('Failed to update credit card');
        }
    }

    /**
     * Delete credit card from Firebase
     * @param {string} cardId - Card ID
     * @returns {Promise<void>}
     */
    static async deleteCreditCard(cardId) {
        try {
            await deleteDoc(doc(db, this.COLLECTION_NAME, cardId));
            console.log('Credit card deleted:', cardId);
        } catch (error) {
            console.error('Error deleting credit card:', error);
            throw new Error('Failed to delete credit card');
        }
    }

    /**
     * Get all credit cards for a user with updated due dates
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of credit cards
     */
    static async getCreditCards(userId) {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const creditCards = [];

            querySnapshot.forEach((doc) => {
                const cardData = {
                    id: doc.id,
                    ...doc.data()
                };

                // Update due date if needed
                const updatedCard = this.updateDueDateIfNeeded(cardData);
                creditCards.push(updatedCard);
            });

            return creditCards;
        } catch (error) {
            console.error('Error getting credit cards:', error);
            throw new Error('Failed to load credit cards');
        }
    }

    /**
     * Subscribe to credit card changes in real-time
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    static subscribeToCreditCards(userId, callback) {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            return onSnapshot(q, (querySnapshot) => {
                const creditCards = [];
                querySnapshot.forEach((doc) => {
                    const cardData = {
                        id: doc.id,
                        ...doc.data()
                    };

                    // Update due date if needed
                    const updatedCard = this.updateDueDateIfNeeded(cardData);
                    creditCards.push(updatedCard);
                });
                callback(creditCards);
            });
        } catch (error) {
            console.error('Error subscribing to credit cards:', error);
            throw new Error('Failed to subscribe to credit card updates');
        }
    }

    /**
     * Batch update due dates for all user's cards
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Updated cards
     */
    static async updateAllDueDates(userId) {
        try {
            const cards = await this.getCreditCards(userId);
            const updatedCards = [];

            for (const card of cards) {
                const updatedCard = this.updateDueDateIfNeeded(card);

                if (updatedCard.dueDate !== card.dueDate) {
                    await this.updateCreditCard(card.id, {
                        dueDate: updatedCard.dueDate,
                        lastDueDateUpdate: updatedCard.lastDueDateUpdate
                    });
                    updatedCards.push(updatedCard);
                }
            }

            return updatedCards;
        } catch (error) {
            console.error('Error updating due dates:', error);
            throw new Error('Failed to update due dates');
        }
    }

    /**
     * Calculate credit utilization
     * @param {number} currentBalance - Current balance
     * @param {number} creditLimit - Credit limit
     * @returns {number} Utilization percentage
     */
    static calculateUtilization(currentBalance, creditLimit) {
        if (!creditLimit || creditLimit <= 0) return 0;
        if (!currentBalance || currentBalance <= 0) return 0;

        return Math.round((currentBalance / creditLimit) * 100);
    }

    /**
     * Calculate minimum payment based on balance and interest rate
     * @param {number} balance - Current balance
     * @param {number} interestRate - Annual interest rate (percentage)
     * @param {number} minPercentage - Minimum payment percentage (default 2%)
     * @returns {number} Minimum payment amount
     */
    static calculateMinimumPayment(balance, interestRate = 0, minPercentage = 2) {
        if (!balance || balance <= 0) return 0;

        // Calculate minimum payment as percentage of balance
        const percentagePayment = balance * (minPercentage / 100);

        // Add monthly interest
        const monthlyInterestRate = (interestRate / 100) / 12;
        const interestCharge = balance * monthlyInterestRate;

        // Minimum payment should cover at least interest + small principal
        const minimumWithInterest = interestCharge + (balance * 0.01); // 1% principal minimum

        // Return the higher of the two calculations, with a minimum of $25
        return Math.max(percentagePayment, minimumWithInterest, 25);
    }

    /**
     * Calculate payoff time
     * @param {number} balance - Current balance
     * @param {number} monthlyPayment - Monthly payment amount
     * @param {number} interestRate - Annual interest rate (percentage)
     * @returns {Object} Payoff information
     */
    static calculatePayoffTime(balance, monthlyPayment, interestRate) {
        if (!balance || balance <= 0) return { months: 0, totalInterest: 0 };
        if (!monthlyPayment || monthlyPayment <= 0) return null;

        const monthlyRate = (interestRate / 100) / 12;
        let currentBalance = balance;
        let months = 0;
        let totalInterest = 0;

        // Prevent infinite loop
        const maxMonths = 600; // 50 years max

        while (currentBalance > 0.01 && months < maxMonths) {
            const interestPayment = currentBalance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;

            if (principalPayment <= 0) {
                // Payment doesn't cover interest
                return null;
            }

            totalInterest += interestPayment;
            currentBalance -= principalPayment;
            months++;
        }

        return {
            months: months,
            years: Math.round((months / 12) * 10) / 10,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalPayments: Math.round((monthlyPayment * months) * 100) / 100
        };
    }

    /**
     * Get cards due soon
     * @param {Array} creditCards - Array of credit cards
     * @param {number} daysAhead - Number of days to look ahead (default 7)
     * @returns {Array} Cards due within the specified days
     */
    static getCardsDueSoon(creditCards, daysAhead = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);

        return creditCards.filter(card => {
            if (!card.dueDate) return false;

            const dueDate = new Date(card.dueDate);
            return dueDate >= today && dueDate <= futureDate;
        });
    }

    /**
     * Get overdue cards
     * @param {Array} creditCards - Array of credit cards
     * @returns {Array} Overdue cards
     */
    static getOverdueCards(creditCards) {
        const today = new Date();

        return creditCards.filter(card => {
            if (!card.dueDate) return false;

            const dueDate = new Date(card.dueDate);
            return dueDate < today;
        });
    }

    /**
     * Calculate total monthly payments
     * @param {Array} creditCards - Array of credit cards
     * @returns {number} Total minimum payments
     */
    static calculateTotalMonthlyPayments(creditCards) {
        return creditCards.reduce((total, card) => {
            return total + (parseFloat(card.minimumPayment) || 0);
        }, 0);
    }

    /**
     * Calculate debt-to-credit ratio
     * @param {Array} creditCards - Array of credit cards
     * @returns {Object} Debt ratios
     */
    static calculateDebtRatios(creditCards) {
        const totalDebt = creditCards.reduce((sum, card) =>
            sum + (parseFloat(card.currentBalance) || 0), 0
        );

        const totalCredit = creditCards.reduce((sum, card) =>
            sum + (parseFloat(card.creditLimit) || 0), 0
        );

        const utilization = totalCredit > 0 ? (totalDebt / totalCredit) * 100 : 0;

        return {
            totalDebt: Math.round(totalDebt * 100) / 100,
            totalCredit: Math.round(totalCredit * 100) / 100,
            availableCredit: Math.round((totalCredit - totalDebt) * 100) / 100,
            utilization: Math.round(utilization * 10) / 10
        };
    }

    /**
     * Get payment recommendations
     * @param {Object} card - Credit card
     * @returns {Object} Payment recommendations
     */
    static getPaymentRecommendations(card) {
        const balance = parseFloat(card.currentBalance) || 0;
        const interestRate = parseFloat(card.interestRate) || 0;
        const minPayment = parseFloat(card.minimumPayment) || 0;

        if (balance <= 0) {
            return {
                recommendation: 'No balance to pay',
                strategies: []
            };
        }

        const strategies = [];

        // Minimum payment strategy
        if (minPayment > 0) {
            const minPayoffInfo = this.calculatePayoffTime(balance, minPayment, interestRate);
            if (minPayoffInfo) {
                strategies.push({
                    name: 'Minimum Payment',
                    payment: minPayment,
                    months: minPayoffInfo.months,
                    totalInterest: minPayoffInfo.totalInterest,
                    type: 'minimum'
                });
            }
        }

        // Aggressive payment strategies
        const aggressivePayments = [
            balance * 0.05, // 5% of balance
            balance * 0.10, // 10% of balance
            minPayment * 2,  // Double minimum
            minPayment * 3   // Triple minimum
        ].filter(payment => payment > minPayment);

        aggressivePayments.forEach((payment, index) => {
            const payoffInfo = this.calculatePayoffTime(balance, payment, interestRate);
            if (payoffInfo) {
                const strategyNames = ['Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'];
                strategies.push({
                    name: strategyNames[index] || 'Extra Aggressive',
                    payment: Math.round(payment),
                    months: payoffInfo.months,
                    totalInterest: payoffInfo.totalInterest,
                    type: 'aggressive'
                });
            }
        });

        // Determine recommendation
        let recommendation = 'Pay at least the minimum payment';
        if (balance > 0 && interestRate > 15) {
            recommendation = 'Consider paying more than minimum due to high interest rate';
        }

        return {
            recommendation,
            strategies: strategies.slice(0, 4) // Limit to 4 strategies
        };
    }

    /**
     * Calculate interest charges for current month
     * @param {Object} card - Credit card
     * @returns {number} Monthly interest charge
     */
    static calculateMonthlyInterest(card) {
        const balance = parseFloat(card.currentBalance) || 0;
        const annualRate = parseFloat(card.interestRate) || 0;

        if (balance <= 0 || annualRate <= 0) return 0;

        const monthlyRate = annualRate / 100 / 12;
        return Math.round(balance * monthlyRate * 100) / 100;
    }

    /**
     * Generate due date display text
     * @param {Object} card - Credit card data
     * @returns {string} Display text for due date
     */
    static getDueDateDisplay(card) {
        const dueDateInfo = this.getDueDateInfo(card);

        if (!dueDateInfo.nextDueDate) {
            return 'No due date set';
        }

        const dueDate = dueDateInfo.nextDueDate.toLocaleDateString();
        const { daysUntilDue } = dueDateInfo;

        if (daysUntilDue === 0) {
            return `${dueDate} (Due Today!)`;
        } else if (daysUntilDue < 0) {
            return `${dueDate} (${Math.abs(daysUntilDue)} days overdue)`;
        } else {
            return `${dueDate} (${daysUntilDue} days left)`;
        }
    }

    /**
     * Get due date type description
     * @param {Object} card - Credit card data
     * @returns {string} Description of due date type
     */
    static getDueDateTypeDescription(card) {
        const { dueDateType, dueDateDay, daysAfterStatement, statementDate } = card;

        switch (dueDateType) {
            case 'fixed':
                const day = dueDateDay || (card.dueDate ? new Date(card.dueDate).getDate() : 1);
                return `Every ${day}${this.getOrdinalSuffix(day)} of the month`;

            case 'floating':
                if (daysAfterStatement && statementDate) {
                    const stmtDay = new Date(statementDate).getDate();
                    return `${daysAfterStatement} days after statement (${stmtDay}${this.getOrdinalSuffix(stmtDay)})`;
                }
                return 'Days after statement date';

            case 'manual':
                return 'Manual updates';

            default:
                return 'Fixed monthly date';
        }
    }

    /**
     * Generate credit card summary
     * @param {Array} creditCards - Array of credit cards
     * @returns {Object} Summary information
     */
    static generateSummary(creditCards) {
        if (!creditCards || creditCards.length === 0) {
            return {
                cardCount: 0,
                totalDebt: 0,
                totalCredit: 0,
                averageUtilization: 0,
                monthlyPayments: 0,
                monthlyInterest: 0,
                cardsDueSoon: [],
                overdueCards: [],
                recommendations: []
            };
        }

        const ratios = this.calculateDebtRatios(creditCards);
        const monthlyPayments = this.calculateTotalMonthlyPayments(creditCards);
        const monthlyInterest = creditCards.reduce((total, card) =>
            total + this.calculateMonthlyInterest(card), 0
        );

        return {
            cardCount: creditCards.length,
            totalDebt: ratios.totalDebt,
            totalCredit: ratios.totalCredit,
            averageUtilization: ratios.utilization,
            monthlyPayments: Math.round(monthlyPayments * 100) / 100,
            monthlyInterest: Math.round(monthlyInterest * 100) / 100,
            cardsDueSoon: this.getCardsDueSoon(creditCards),
            overdueCards: this.getOverdueCards(creditCards),
            recommendations: this.generateRecommendations(creditCards)
        };
    }

    /**
     * Generate financial recommendations
     * @param {Array} creditCards - Array of credit cards
     * @returns {Array} Array of recommendations
     */
    static generateRecommendations(creditCards) {
        const recommendations = [];
        const ratios = this.calculateDebtRatios(creditCards);

        // High utilization warning
        if (ratios.utilization > 80) {
            recommendations.push({
                type: 'warning',
                title: 'High Credit Utilization',
                message: `Your overall utilization is ${ratios.utilization}%. Keep it below 30% for better credit health.`,
                priority: 'high'
            });
        }

        // Due date reminders
        const dueSoon = this.getCardsDueSoon(creditCards, 3);
        if (dueSoon.length > 0) {
            recommendations.push({
                type: 'reminder',
                title: 'Payments Due Soon',
                message: `${dueSoon.length} card(s) have payments due within 3 days.`,
                priority: 'high'
            });
        }

        // Overdue warnings
        const overdue = this.getOverdueCards(creditCards);
        if (overdue.length > 0) {
            recommendations.push({
                type: 'error',
                title: 'Overdue Payments',
                message: `${overdue.length} card(s) have overdue payments. Pay immediately to avoid fees.`,
                priority: 'critical'
            });
        }

        // High interest rate cards
        const highInterestCards = creditCards.filter(card =>
            parseFloat(card.interestRate) > 20 && parseFloat(card.currentBalance) > 0
        );

        if (highInterestCards.length > 0) {
            recommendations.push({
                type: 'tip',
                title: 'High Interest Rates',
                message: `Consider paying off high-interest cards first or transferring balances to lower-rate cards.`,
                priority: 'medium'
            });
        }

        // Positive reinforcement
        if (ratios.utilization < 30 && overdue.length === 0) {
            recommendations.push({
                type: 'success',
                title: 'Great Credit Management!',
                message: 'Your credit utilization is healthy and all payments are current.',
                priority: 'low'
            });
        }

        return recommendations;
    }
}