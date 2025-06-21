// App.js - Example of how to integrate the AI insights functionality

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { useCreditCards } from './hooks/useCreditCards';
import { TaxCalculatorService } from './services/TaxCalculatorService';
import Dashboard from './components/Dashboard';
import PaycheckCalculator from './components/PaycheckCalculator';
import ExpenseManager from './components/ExpenseManager';
import CreditCardManager from './components/CreditCardManager';

const App = () => {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    // User data hooks
    const {
        paycheckData,
        expenses,
        savePaycheckData,
        saveExpense,
        deleteExpense,
        loading: dataLoading
    } = useUserData(user);

    // Credit cards hook
    const {
        creditCards,
        saveCreditCard,
        updateCreditCard,
        deleteCreditCard,
        loading: creditCardsLoading
    } = useCreditCards(user);

    // Calculate tax information
    const taxCalculations = React.useMemo(() => {
        if (!paycheckData.grossSalary) return null;

        return TaxCalculatorService.calculateTaxes(
            parseFloat(paycheckData.grossSalary),
            paycheckData.state,
            paycheckData.visaStatus,
            paycheckData.filingStatus
        );
    }, [paycheckData]);

    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your financial data...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Sign in to your account
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Get AI-powered financial insights
                        </p>
                    </div>
                    {/* Add your authentication components here */}
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', name: 'Dashboard', icon: '📊' },
        { id: 'paycheck', name: 'Paycheck', icon: '💰' },
        { id: 'expenses', name: 'Expenses', icon: '📝' },
        { id: 'creditcards', name: 'Credit Cards', icon: '💳' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-gray-900">
                                    AI Financial Planner
                                </h1>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`${
                                            activeTab === tab.id
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User menu */}
                        <div className="flex items-center">
                            <span className="text-sm text-gray-700 mr-4">
                                Welcome, {user.displayName || user.email}
                            </span>
                            <button
                                onClick={() => {/* Add logout functionality */}}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {activeTab === 'dashboard' && (
                        <Dashboard
                            taxCalculations={taxCalculations}
                            expenses={expenses}
                            creditCards={creditCards}
                            user={user}
                        />
                    )}

                    {activeTab === 'paycheck' && (
                        <PaycheckCalculator
                            paycheckData={paycheckData}
                            onSave={savePaycheckData}
                        />
                    )}

                    {activeTab === 'expenses' && (
                        <ExpenseManager
                            expenses={expenses}
                            onSave={saveExpense}
                            onDelete={deleteExpense}
                        />
                    )}

                    {activeTab === 'creditcards' && (
                        <CreditCardManager
                            creditCards={creditCards}
                            onSave={saveCreditCard}
                            onUpdate={updateCreditCard}
                            onDelete={deleteCreditCard}
                            userId={user.uid}
                        />
                    )}
                </div>
            </main>

            {/* AI Insights Status Indicator */}
            <div className="fixed bottom-4 right-4">
                <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-600">AI Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;