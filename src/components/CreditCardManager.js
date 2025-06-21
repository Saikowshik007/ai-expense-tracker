import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    Trash2,
    DollarSign,
    Calendar,
    TrendingUp,
    AlertCircle,
    Eye,
    EyeOff,
    Edit3,
    Check,
    X,
    Clock,
    Info
} from 'lucide-react';
import { Button, Card, Input, Alert, LoadingSpinner } from './UI';
import { CreditCardService } from '../services/CreditCardService';

/**
 * Enhanced Credit Card Manager Component
 * Handles credit card tracking with payment reminders, balances, and auto-updating due dates
 */
const CreditCardManager = ({ creditCards = [], onSave, onDelete, onUpdate, userId }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [showBalances, setShowBalances] = useState({});
    const [selectedCard, setSelectedCard] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        lastFour: '',
        creditLimit: '',
        currentBalance: '',
        interestRate: '',
        dueDate: '',
        dueDateType: 'fixed',
        dueDateDay: '',
        daysAfterStatement: '',
        minimumPayment: '',
        lastPaidDate: '',
        lastPaidAmount: '',
        statementDate: '',
        cardType: 'credit',
        bankName: '',
        notes: ''
    });

    const [formErrors, setFormErrors] = useState({});

    /**
     * Default implementations if props are not provided
     */
    const handleSave = async (cardData) => {
        if (onSave && typeof onSave === 'function') {
            return await onSave(cardData);
        } else if (userId) {
            // Fallback to direct service call if userId is provided
            return await CreditCardService.saveCreditCard(userId, cardData);
        } else {
            throw new Error('No save handler provided and no userId available');
        }
    };

    const handleUpdate = async (cardId, cardData) => {
        if (onUpdate && typeof onUpdate === 'function') {
            return await onUpdate(cardId, cardData);
        } else {
            // Fallback to direct service call
            return await CreditCardService.updateCreditCard(cardId, cardData);
        }
    };

    const handleDelete = async (cardId) => {
        if (onDelete && typeof onDelete === 'function') {
            return await onDelete(cardId);
        } else {
            // Fallback to direct service call
            return await CreditCardService.deleteCreditCard(cardId);
        }
    };

    /**
     * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
     * @param {number} day - Day number
     * @returns {string} Ordinal suffix
     */
    const getOrdinalSuffix = (day) => {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    /**
     * Calculate days until due date
     * @param {string} dueDate - Due date string
     * @returns {number} Days until due
     */
    const getDaysUntilDue = (dueDate) => {
        if (!dueDate) return null;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    /**
     * Get due date status color
     * @param {number} daysUntilDue - Days until due
     * @returns {string} Tailwind color class
     */
    const getDueDateColor = (daysUntilDue) => {
        if (daysUntilDue === null) return 'text-gray-500';
        if (daysUntilDue < 0) return 'text-red-600'; // Overdue
        if (daysUntilDue <= 3) return 'text-orange-600'; // Due soon
        if (daysUntilDue <= 7) return 'text-yellow-600'; // Due this week
        return 'text-green-600'; // Not due soon
    };

    /**
     * Calculate credit utilization
     * @param {Object} card - Credit card data
     * @returns {number} Utilization percentage
     */
    const calculateUtilization = (card) => {
        if (!card.creditLimit || !card.currentBalance) return 0;
        return Math.round((parseFloat(card.currentBalance) / parseFloat(card.creditLimit)) * 100);
    };

    /**
     * Get utilization color based on percentage
     * @param {number} utilization - Utilization percentage
     * @returns {string} Tailwind color class
     */
    const getUtilizationColor = (utilization) => {
        if (utilization <= 30) return 'text-green-600';
        if (utilization <= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    /**
     * Get card type icon
     * @param {string} cardType - Type of card
     * @returns {JSX.Element} Icon component
     */
    const getCardIcon = (cardType) => {
        switch (cardType) {
            case 'credit':
                return <CreditCard className="w-5 h-5" />;
            case 'debit':
                return <DollarSign className="w-5 h-5" />;
            default:
                return <CreditCard className="w-5 h-5" />;
        }
    };

    /**
     * Validate form data
     * @returns {Object} Validation errors
     */
    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Card name is required';
        }

        if (!formData.lastFour.trim()) {
            errors.lastFour = 'Last four digits are required';
        } else if (!/^\d{4}$/.test(formData.lastFour)) {
            errors.lastFour = 'Must be 4 digits';
        }

        if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
            errors.creditLimit = 'Must be a valid number';
        }

        if (formData.currentBalance && isNaN(parseFloat(formData.currentBalance))) {
            errors.currentBalance = 'Must be a valid number';
        }

        if (formData.interestRate && (isNaN(parseFloat(formData.interestRate)) || parseFloat(formData.interestRate) < 0 || parseFloat(formData.interestRate) > 100)) {
            errors.interestRate = 'Must be between 0 and 100';
        }

        if (formData.minimumPayment && isNaN(parseFloat(formData.minimumPayment))) {
            errors.minimumPayment = 'Must be a valid number';
        }

        if (formData.lastPaidAmount && isNaN(parseFloat(formData.lastPaidAmount))) {
            errors.lastPaidAmount = 'Must be a valid number';
        }

        // Validate due date type specific fields
        if (formData.dueDateType === 'floating') {
            if (!formData.statementDate) {
                errors.statementDate = 'Statement date is required for floating due dates';
            }
            if (!formData.daysAfterStatement) {
                errors.daysAfterStatement = 'Days after statement is required';
            } else if (isNaN(parseInt(formData.daysAfterStatement)) || parseInt(formData.daysAfterStatement) < 1) {
                errors.daysAfterStatement = 'Must be a valid number greater than 0';
            }
        }

        if (formData.dueDateDay && (isNaN(parseInt(formData.dueDateDay)) || parseInt(formData.dueDateDay) < 1 || parseInt(formData.dueDateDay) > 31)) {
            errors.dueDateDay = 'Must be between 1 and 31';
        }

        return errors;
    };

    /**
     * Handle form submission
     * @param {Event} e - Form event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSaving(true);
        try {
            const cardData = {
                ...formData,
                creditLimit: parseFloat(formData.creditLimit) || 0,
                currentBalance: parseFloat(formData.currentBalance) || 0,
                interestRate: parseFloat(formData.interestRate) || 0,
                minimumPayment: parseFloat(formData.minimumPayment) || 0,
                lastPaidAmount: parseFloat(formData.lastPaidAmount) || 0,
                dueDateDay: formData.dueDateDay ? parseInt(formData.dueDateDay) : null,
                daysAfterStatement: formData.daysAfterStatement ? parseInt(formData.daysAfterStatement) : null
            };

            if (editingCard) {
                await handleUpdate(editingCard.id, cardData);
                setEditingCard(null);
            } else {
                await handleSave(cardData);
            }

            // Reset form
            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error('Error saving credit card:', error);
            alert('Failed to save credit card. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Reset form data
     */
    const resetForm = () => {
        setFormData({
            name: '',
            lastFour: '',
            creditLimit: '',
            currentBalance: '',
            interestRate: '',
            dueDate: '',
            dueDateType: 'fixed',
            dueDateDay: '',
            daysAfterStatement: '',
            minimumPayment: '',
            lastPaidDate: '',
            lastPaidAmount: '',
            statementDate: '',
            cardType: 'credit',
            bankName: '',
            notes: ''
        });
        setFormErrors({});
    };

    /**
     * Handle input changes
     * @param {string} field - Field name
     * @param {string} value - Field value
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear field error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    /**
     * Toggle balance visibility
     * @param {string} cardId - Card ID
     */
    const toggleBalanceVisibility = (cardId) => {
        setShowBalances(prev => ({
            ...prev,
            [cardId]: !prev[cardId]
        }));
    };

    /**
     * Start editing a card
     * @param {Object} card - Card to edit
     */
    const startEditing = (card) => {
        setFormData({
            name: card.name || '',
            lastFour: card.lastFour || '',
            creditLimit: card.creditLimit || '',
            currentBalance: card.currentBalance || '',
            interestRate: card.interestRate || '',
            dueDate: card.dueDate || '',
            dueDateType: card.dueDateType || 'fixed',
            dueDateDay: card.dueDateDay || '',
            daysAfterStatement: card.daysAfterStatement || '',
            minimumPayment: card.minimumPayment || '',
            lastPaidDate: card.lastPaidDate || '',
            lastPaidAmount: card.lastPaidAmount || '',
            statementDate: card.statementDate || '',
            cardType: card.cardType || 'credit',
            bankName: card.bankName || '',
            notes: card.notes || ''
        });
        setEditingCard(card);
        setShowAddForm(true);
    };

    /**
     * Record a payment
     * @param {Object} card - Card to record payment for
     * @param {number} amount - Payment amount
     */
    const recordPayment = async (card, amount) => {
        try {
            const newBalance = Math.max(0, parseFloat(card.currentBalance) - amount);
            const updatedCard = {
                ...card,
                currentBalance: newBalance,
                lastPaidDate: new Date().toISOString().split('T')[0],
                lastPaidAmount: amount
            };

            await handleUpdate(card.id, updatedCard);
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment. Please try again.');
        }
    };

    /**
     * Handle card deletion with confirmation
     * @param {string} cardId - Card ID to delete
     */
    const confirmDelete = async (cardId) => {
        if (window.confirm('Are you sure you want to delete this credit card?')) {
            try {
                await handleDelete(cardId);
            } catch (error) {
                console.error('Error deleting card:', error);
                alert('Failed to delete credit card. Please try again.');
            }
        }
    };

    /**
     * Calculate summary statistics
     */
    const safeCards = creditCards || [];
    const totalDebt = safeCards.reduce((sum, card) => sum + (parseFloat(card.currentBalance) || 0), 0);
    const totalCreditLimit = safeCards.reduce((sum, card) => sum + (parseFloat(card.creditLimit) || 0), 0);
    const totalMinimumPayments = safeCards.reduce((sum, card) => sum + (parseFloat(card.minimumPayment) || 0), 0);
    const overallUtilization = totalCreditLimit > 0 ? Math.round((totalDebt / totalCreditLimit) * 100) : 0;

    // Get cards due soon (within 7 days)
    const cardsDueSoon = safeCards.filter(card => {
        const daysUntil = getDaysUntilDue(card.dueDate);
        return daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Credit Cards</h2>
                    <p className="text-gray-600">Track balances, due dates, and payments with auto-updating due dates</p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    icon={<Plus className="w-4 h-4" />}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    Add Card
                </Button>
            </div>

            {/* Alerts for due dates */}
            {cardsDueSoon.length > 0 && (
                <Alert type="warning" className="border-orange-200 bg-orange-50">
                    <AlertCircle className="w-4 h-4" />
                    <div>
                        <strong>Payment Reminders:</strong>
                        <ul className="mt-1 text-sm">
                            {cardsDueSoon.map(card => {
                                const daysUntil = getDaysUntilDue(card.dueDate);
                                return (
                                    <li key={card.id}>
                                        {card.name} - Due {daysUntil === 0 ? 'today' : `in ${daysUntil} days`}
                                        {card.minimumPayment && ` (Min: ${parseFloat(card.minimumPayment).toLocaleString()})`}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Debt</p>
                            <p className="text-2xl font-bold text-red-600">
                                ${totalDebt.toLocaleString()}
                            </p>
                        </div>
                        <CreditCard className="w-8 h-8 text-red-600" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Available Credit</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${(totalCreditLimit - totalDebt).toLocaleString()}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Overall Utilization</p>
                            <p className={`text-2xl font-bold ${getUtilizationColor(overallUtilization)}`}>
                                {overallUtilization}%
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Min Payments</p>
                            <p className="text-2xl font-bold text-orange-600">
                                ${totalMinimumPayments.toLocaleString()}
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-orange-600" />
                    </div>
                </Card>
            </div>

            {/* Credit Cards List */}
            {safeCards.length === 0 ? (
                <Card className="p-12 text-center">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Cards</h3>
                    <p className="text-gray-500 mb-6">
                        Add your first credit card to start tracking payments and balances.
                    </p>
                    <Button
                        onClick={() => setShowAddForm(true)}
                        icon={<Plus className="w-4 h-4" />}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        Add Credit Card
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {safeCards.map((card) => {
                        const utilization = calculateUtilization(card);
                        const isBalanceVisible = showBalances[card.id];
                        const daysUntilDue = getDaysUntilDue(card.dueDate);
                        const dueDateTypeDesc = CreditCardService.getDueDateTypeDescription(card);

                        return (
                            <Card key={card.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        {getCardIcon(card.cardType)}
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{card.name}</h3>
                                            <p className="text-sm text-gray-500">
                                                •••• •••• •••• {card.lastFour}
                                            </p>
                                            {card.bankName && (
                                                <p className="text-xs text-gray-400">{card.bankName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleBalanceVisibility(card.id)}
                                            icon={isBalanceVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            title={isBalanceVisible ? "Hide balance" : "Show balance"}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startEditing(card)}
                                            icon={<Edit3 className="w-3 h-3" />}
                                            title="Edit card"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => confirmDelete(card.id)}
                                            icon={<Trash2 className="w-3 h-3" />}
                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                            title="Delete card"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Balance and Limit */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Current Balance</span>
                                        <span className="font-semibold text-red-600">
                      {isBalanceVisible ? `${parseFloat(card.currentBalance || 0).toLocaleString()}` : '••••••'}
                    </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Credit Limit</span>
                                        <span className="font-semibold text-gray-900">
                      {isBalanceVisible ? `${parseFloat(card.creditLimit || 0).toLocaleString()}` : '••••••'}
                    </span>
                                    </div>

                                    {/* Utilization Bar */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm text-gray-500">Utilization</span>
                                            <span className={`text-sm font-semibold ${getUtilizationColor(utilization)}`}>
                        {utilization}%
                      </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    utilization <= 30 ? 'bg-green-500' :
                                                        utilization <= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min(utilization, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Payment Information */}
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        {/* Due Date with Type Info */}
                                        {card.dueDate && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Due Date
                          </span>
                                                    <span className={`text-xs font-medium ${getDueDateColor(daysUntilDue)}`}>
                            {new Date(card.dueDate).toLocaleDateString()}
                                                        {daysUntilDue !== null && (
                                                            <span className="ml-1">
                                ({daysUntilDue === 0 ? 'Today' :
                                                                daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` :
                                                                    `${daysUntilDue}d left`})
                              </span>
                                                        )}
                          </span>
                                                </div>
                                                {/* Due Date Type Description */}
                                                <div className="flex items-center text-xs text-gray-400">
                                                    <Info className="w-3 h-3 mr-1" />
                                                    <span>{dueDateTypeDesc}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Minimum Payment */}
                                        {card.minimumPayment && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500">Min Payment</span>
                                                <span className="text-xs font-medium">${parseFloat(card.minimumPayment || 0).toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* Interest Rate */}
                                        {card.interestRate && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500">Interest Rate</span>
                                                <span className="text-xs font-medium">{card.interestRate}% APR</span>
                                            </div>
                                        )}

                                        {/* Last Payment */}
                                        {card.lastPaidDate && (
                                            <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          Last Payment
                        </span>
                                                <span className="text-xs font-medium">
                          ${parseFloat(card.lastPaidAmount || 0).toLocaleString()}
                                                    <span className="text-gray-400 ml-1">
                            ({new Date(card.lastPaidDate).toLocaleDateString()})
                          </span>
                        </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Payment Button */}
                                    {card.minimumPayment && parseFloat(card.currentBalance) > 0 && (
                                        <div className="pt-3 border-t border-gray-100">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const amount = prompt(`Enter payment amount for ${card.name}:`, card.minimumPayment);
                                                    if (amount && !isNaN(parseFloat(amount))) {
                                                        recordPayment(card, parseFloat(amount));
                                                    }
                                                }}
                                                className="w-full text-green-600 border-green-300 hover:bg-green-50"
                                                icon={<DollarSign className="w-3 h-3" />}
                                            >
                                                Record Payment
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Warnings */}
                                {utilization > 80 && (
                                    <Alert type="warning" className="mt-4">
                                        <AlertCircle className="w-4 h-4" />
                                        High credit utilization may impact your credit score
                                    </Alert>
                                )}

                                {daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && (
                                    <Alert type="error" className="mt-4">
                                        <Clock className="w-4 h-4" />
                                        Payment due {daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}!
                                    </Alert>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Card Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingCard(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Card Name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            error={formErrors.name}
                                            placeholder="e.g., Chase Freedom"
                                            required
                                        />

                                        <Input
                                            label="Bank Name"
                                            value={formData.bankName}
                                            onChange={(e) => handleInputChange('bankName', e.target.value)}
                                            error={formErrors.bankName}
                                            placeholder="e.g., Chase Bank"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <Input
                                            label="Last Four Digits"
                                            value={formData.lastFour}
                                            onChange={(e) => handleInputChange('lastFour', e.target.value)}
                                            error={formErrors.lastFour}
                                            placeholder="1234"
                                            maxLength={4}
                                            required
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Card Type
                                            </label>
                                            <select
                                                value={formData.cardType}
                                                onChange={(e) => handleInputChange('cardType', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="credit">Credit Card</option>
                                                <option value="debit">Debit Card</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Details */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Financial Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Credit Limit"
                                            type="number"
                                            value={formData.creditLimit}
                                            onChange={(e) => handleInputChange('creditLimit', e.target.value)}
                                            error={formErrors.creditLimit}
                                            placeholder="5000"
                                        />

                                        <Input
                                            label="Current Balance"
                                            type="number"
                                            value={formData.currentBalance}
                                            onChange={(e) => handleInputChange('currentBalance', e.target.value)}
                                            error={formErrors.currentBalance}
                                            placeholder="1200"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <Input
                                            label="Interest Rate (% APR)"
                                            type="number"
                                            step="0.01"
                                            value={formData.interestRate}
                                            onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                            error={formErrors.interestRate}
                                            placeholder="18.99"
                                        />

                                        <Input
                                            label="Minimum Payment"
                                            type="number"
                                            value={formData.minimumPayment}
                                            onChange={(e) => handleInputChange('minimumPayment', e.target.value)}
                                            error={formErrors.minimumPayment}
                                            placeholder="35"
                                        />
                                    </div>
                                </div>

                                {/* Due Date Configuration */}
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900">Due Date Settings</h4>

                                    {/* Due Date Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Due Date Type
                                        </label>
                                        <select
                                            value={formData.dueDateType}
                                            onChange={(e) => handleInputChange('dueDateType', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="fixed">Fixed Day Each Month (e.g., always 15th)</option>
                                            <option value="floating">Days After Statement Date</option>
                                            <option value="manual">Manual (I'll update myself)</option>
                                        </select>
                                    </div>

                                    {/* Fixed Due Date */}
                                    {(formData.dueDateType === 'fixed' || !formData.dueDateType) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Due Date"
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                                error={formErrors.dueDate}
                                                help="This will auto-update each month"
                                            />

                                            <Input
                                                label="Day of Month (1-31)"
                                                type="number"
                                                min="1"
                                                max="31"
                                                value={formData.dueDateDay}
                                                onChange={(e) => handleInputChange('dueDateDay', e.target.value)}
                                                error={formErrors.dueDateDay}
                                                placeholder="15"
                                                help="Override if different from date above"
                                            />
                                        </div>
                                    )}

                                    {/* Floating Due Date */}
                                    {formData.dueDateType === 'floating' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Statement Date"
                                                type="date"
                                                value={formData.statementDate}
                                                onChange={(e) => handleInputChange('statementDate', e.target.value)}
                                                error={formErrors.statementDate}
                                                required
                                            />

                                            <Input
                                                label="Days After Statement"
                                                type="number"
                                                min="1"
                                                max="45"
                                                value={formData.daysAfterStatement}
                                                onChange={(e) => handleInputChange('daysAfterStatement', e.target.value)}
                                                error={formErrors.daysAfterStatement}
                                                placeholder="25"
                                                help="Usually 21-25 days"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Manual Due Date */}
                                    {formData.dueDateType === 'manual' && (
                                        <Input
                                            label="Due Date"
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                            error={formErrors.dueDate}
                                            help="You'll need to update this manually each month"
                                        />
                                    )}

                                    {/* Due Date Preview */}
                                    {formData.dueDate && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                            <p className="text-sm text-blue-800">
                                                <strong>Preview:</strong>
                                                {formData.dueDateType === 'fixed' ?
                                                    ` Due every ${formData.dueDateDay || new Date(formData.dueDate).getDate()}${getOrdinalSuffix(formData.dueDateDay || new Date(formData.dueDate).getDate())} of the month` :
                                                    formData.dueDateType === 'floating' ?
                                                        ` Due ${formData.daysAfterStatement || 25} days after statement (${formData.statementDate ? new Date(formData.statementDate).getDate() : '?'}${getOrdinalSuffix(formData.statementDate ? new Date(formData.statementDate).getDate() : 1)})` :
                                                        ' Manual due date - you\'ll update this yourself'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Statement Date */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Statement Information</h4>
                                    <Input
                                        label="Statement Date"
                                        type="date"
                                        value={formData.statementDate}
                                        onChange={(e) => handleInputChange('statementDate', e.target.value)}
                                        error={formErrors.statementDate}
                                        help="When your monthly statement is generated"
                                    />
                                </div>

                                {/* Last Payment Info */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Last Payment Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Last Payment Date"
                                            type="date"
                                            value={formData.lastPaidDate}
                                            onChange={(e) => handleInputChange('lastPaidDate', e.target.value)}
                                            error={formErrors.lastPaidDate}
                                        />

                                        <Input
                                            label="Last Payment Amount"
                                            type="number"
                                            value={formData.lastPaidAmount}
                                            onChange={(e) => handleInputChange('lastPaidAmount', e.target.value)}
                                            error={formErrors.lastPaidAmount}
                                            placeholder="100"
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        placeholder="Any additional notes about this card..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setEditingCard(null);
                                            resetForm();
                                        }}
                                        className="flex-1"
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <LoadingSpinner className="w-4 h-4 mr-2" />
                                                {editingCard ? 'Updating...' : 'Adding...'}
                                            </>
                                        ) : (
                                            editingCard ? 'Update Card' : 'Add Card'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CreditCardManager;