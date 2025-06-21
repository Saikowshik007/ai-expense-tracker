import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { useCreditCards } from './hooks/useCreditCards';
import { TaxCalculatorService } from './services/TaxCalculatorService';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import PaycheckCalculator from './components/PaycheckCalculator';
import ExpenseManager from './components/ExpenseManager';
import CreditCardManager from './components/CreditCardManager';
import ApiKeySettings from './components/ApiKeySettings';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize error handling
if (process.env.NODE_ENV === 'production') {
    const originalError = console.error;
    console.error = (...args) => {
        const message = args.join(' ');
        if (!message.includes('Could not establish connection')) {
            originalError.apply(console, args);
        }
    };
}

const App = () => {
    const { user, loading: authLoading, signOutUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    // User data hooks - ALL HOOKS MUST BE CALLED AT TOP LEVEL
    const {
        paycheckData,
        expenses,
        apiKeys,
        hasApiKey,
        savePaycheckData,
        saveExpense,
        deleteExpense,
        loading: dataLoading
    } = useUserData(user);

    // Credit cards hook - ALWAYS call the hook, don't conditionally call it
    const {
        creditCards,
        saveCreditCard,
        updateCreditCard,
        deleteCreditCard,
        loading: creditCardsLoading
    } = useCreditCards(user);

    // Calculate tax information
    const taxCalculations = React.useMemo(() => {
        if (!paycheckData?.grossSalary) return null;

        return TaxCalculatorService.calculateTaxes(
            parseFloat(paycheckData.grossSalary),
            paycheckData.state || 'CA',
            paycheckData.visaStatus || 'citizen',
            paycheckData.filingStatus || 'single'
        );
    }, [paycheckData]);

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show AuthForm
    if (!user) {
        return (
            <ErrorBoundary>
                <AuthForm />
            </ErrorBoundary>
        );
    }

    // Authenticated - show main app
    const tabs = [
        { id: 'dashboard', name: 'Dashboard', icon: '📊' },
        { id: 'paycheck', name: 'Paycheck', icon: '💰' },
        { id: 'expenses', name: 'Expenses', icon: '📝' },
        { id: 'creditcards', name: 'Credit Cards', icon: '💳' },
        { id: 'settings', name: 'API Settings', icon: '⚙️' }
    ];

    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gray-50">
                {/* Navigation */}
                <nav className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                <div className="flex-shrink-0 flex items-center">
                                    <h1 className="text-xl font-bold text-gray-900">
                                        AI Expense Tracker
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

                            {/* Mobile menu button */}
                            <div className="sm:hidden flex items-center">
                                <select
                                    value={activeTab}
                                    onChange={(e) => setActiveTab(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                                >
                                    {tabs.map((tab) => (
                                        <option key={tab.id} value={tab.id}>
                                            {tab.icon} {tab.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* User menu */}
                            <div className="flex items-center space-x-4">
                                {/* API Key Status */}
                                <div className="hidden sm:flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        hasApiKey() ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                                    }`}></div>
                                    <span className="text-xs text-gray-600">
                                        {hasApiKey() ? 'AI Ready' : 'Add API Key'}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700">
                                        {user.displayName || user.email}
                                    </span>
                                    <button
                                        onClick={handleSignOut}
                                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main content */}
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        {dataLoading || creditCardsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                    <p className="text-gray-600">Loading your data...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'dashboard' && (
                                    <Dashboard
                                        taxCalculations={taxCalculations}
                                        expenses={expenses}
                                        creditCards={creditCards || []}
                                        user={user}
                                    />
                                )}

                                {activeTab === 'paycheck' && (
                                    <PaycheckCalculator
                                        paycheckData={paycheckData}
                                        onSave={savePaycheckData}
                                        taxCalculations={taxCalculations}
                                    />
                                )}

                                {activeTab === 'expenses' && (
                                    <ExpenseManager
                                        expenses={expenses}
                                        onSave={saveExpense}
                                        onDelete={deleteExpense}
                                        user={user}
                                    />
                                )}

                                {activeTab === 'creditcards' && (
                                    <CreditCardManager
                                        creditCards={creditCards || []}
                                        onSave={saveCreditCard}
                                        onUpdate={updateCreditCard}
                                        onDelete={deleteCreditCard}
                                        userId={user.uid}
                                    />
                                )}

                                {activeTab === 'settings' && (
                                    <ApiKeySettings />
                                )}
                            </>
                        )}
                    </div>
                </main>

                {/* API Key Status Indicator (Mobile) */}
                <div className="sm:hidden fixed bottom-4 right-4">
                    <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                                hasApiKey() ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                            }`}></div>
                            <span className="text-xs text-gray-600">
                                {hasApiKey() ? 'AI Ready' : 'Setup needed'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;