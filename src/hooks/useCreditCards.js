import { useState, useEffect, useCallback } from 'react';
import { CreditCardService } from '../services/CreditCardService';

/**
 * Custom Hook for Credit Card Management
 * Handles all credit card related operations using the CreditCardService
 */
export const useCreditCards = (user) => {
    const [creditCards, setCreditCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load credit cards from Firebase
     */
    const loadCreditCards = useCallback(async () => {
        if (!user?.uid) return;

        setLoading(true);
        setError(null);

        try {
            const cards = await CreditCardService.getCreditCards(user.uid);
            setCreditCards(cards);
        } catch (error) {
            console.error('Error loading credit cards:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Load credit cards when user changes
     */
    useEffect(() => {
        if (user?.uid) {
            loadCreditCards();
        } else {
            // Reset data when user logs out
            setCreditCards([]);
        }
    }, [user?.uid, loadCreditCards]);

    /**
     * Save a new credit card
     * @param {Object} cardData - Credit card data
     * @returns {Promise<string>} Document ID
     */
    const saveCreditCard = useCallback(async (cardData) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            const cardId = await CreditCardService.saveCreditCard(user.uid, cardData);

            // Refresh the cards list
            await loadCreditCards();

            return cardId;
        } catch (error) {
            console.error('Error saving credit card:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.uid, loadCreditCards]);

    /**
     * Update an existing credit card
     * @param {string} cardId - Card ID
     * @param {Object} cardData - Updated card data
     * @returns {Promise<void>}
     */
    const updateCreditCard = useCallback(async (cardId, cardData) => {
        try {
            setLoading(true);
            setError(null);

            await CreditCardService.updateCreditCard(cardId, cardData);

            // Update local state immediately for better UX
            setCreditCards(prevCards =>
                prevCards.map(card =>
                    card.id === cardId
                        ? { ...card, ...cardData, updatedAt: new Date() }
                        : card
                )
            );

            // Optionally refresh from server to ensure consistency
            await loadCreditCards();
        } catch (error) {
            console.error('Error updating credit card:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [loadCreditCards]);

    /**
     * Delete a credit card
     * @param {string} cardId - Card ID
     * @returns {Promise<void>}
     */
    const deleteCreditCard = useCallback(async (cardId) => {
        try {
            setLoading(true);
            setError(null);

            await CreditCardService.deleteCreditCard(cardId);

            // Update local state immediately
            setCreditCards(prevCards =>
                prevCards.filter(card => card.id !== cardId)
            );
        } catch (error) {
            console.error('Error deleting credit card:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Subscribe to real-time credit card updates
     * @returns {Function} Unsubscribe function
     */
    const subscribeToUpdates = useCallback(() => {
        if (!user?.uid) return () => {};

        try {
            return CreditCardService.subscribeToCreditCards(user.uid, (cards) => {
                setCreditCards(cards);
                setError(null);
            });
        } catch (error) {
            console.error('Error subscribing to credit card updates:', error);
            setError(error.message);
            return () => {};
        }
    }, [user?.uid]);

    /**
     * Get cards due soon
     * @param {number} daysAhead - Days to look ahead
     * @returns {Array} Cards due within specified days
     */
    const getCardsDueSoon = useCallback((daysAhead = 7) => {
        return CreditCardService.getCardsDueSoon(creditCards, daysAhead);
    }, [creditCards]);

    /**
     * Get overdue cards
     * @returns {Array} Overdue cards
     */
    const getOverdueCards = useCallback(() => {
        return CreditCardService.getOverdueCards(creditCards);
    }, [creditCards]);

    /**
     * Calculate debt ratios
     * @returns {Object} Debt ratio information
     */
    const getDebtRatios = useCallback(() => {
        return CreditCardService.calculateDebtRatios(creditCards);
    }, [creditCards]);

    /**
     * Get summary information
     * @returns {Object} Summary data
     */
    const getSummary = useCallback(() => {
        return CreditCardService.generateSummary(creditCards);
    }, [creditCards]);

    /**
     * Get payment recommendations for a card
     * @param {Object} card - Credit card
     * @returns {Object} Payment recommendations
     */
    const getPaymentRecommendations = useCallback((card) => {
        return CreditCardService.getPaymentRecommendations(card);
    }, []);

    /**
     * Calculate monthly interest for a card
     * @param {Object} card - Credit card
     * @returns {number} Monthly interest amount
     */
    const calculateMonthlyInterest = useCallback((card) => {
        return CreditCardService.calculateMonthlyInterest(card);
    }, []);

    /**
     * Clear any existing errors
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Refresh credit cards data
     */
    const refreshCreditCards = useCallback(async () => {
        await loadCreditCards();
    }, [loadCreditCards]);

    return {
        // State
        creditCards,
        loading,
        error,

        // Actions
        saveCreditCard,
        updateCreditCard,
        deleteCreditCard,
        subscribeToUpdates,
        refreshCreditCards,
        clearError,

        // Computed values
        cardsDueSoon: getCardsDueSoon(),
        overdueCards: getOverdueCards(),
        debtRatios: getDebtRatios(),
        summary: getSummary(),

        // Utility functions
        getCardsDueSoon,
        getOverdueCards,
        getDebtRatios,
        getSummary,
        getPaymentRecommendations,
        calculateMonthlyInterest
    };
};