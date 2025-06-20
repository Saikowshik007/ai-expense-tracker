import React, { useState, useMemo } from 'react';
import { Calculator, LogOut } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { TaxCalculatorService } from './services/TaxCalculatorService';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import PaycheckCalculator from './components/PaycheckCalculator';
import ExpenseManager from './components/ExpenseManager';
import LoadingSpinner from './components/LoadingSpinner';

const ExpenseTracker = () => {
    const { user, loading: authLoading, signOutUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    const {
        paycheckData,
        expenses,
        loading: dataLoading,
        savePaycheckData,
        saveExpense,
        deleteExpense
    } = useUserData(user);

    // Memoize tax calculations to avoid recalculation on every render
    const taxCalculations = useMemo(() => {
        if (!paycheckData.grossSalary) return null;

        return TaxCalculatorService.calculateTaxes(
            parseFloat(paycheckData.grossSalary),
            paycheckData.state,
            paycheckData.visaStatus,
            paycheckData.filingStatus
        );
    }, [paycheckData]);

    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (authLoading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <AuthForm />;
    }

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'paycheck', label: 'Paycheck' },
        { id: 'expenses', label: 'Expenses' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Calculator className="w-8 h-8 text-indigo-600 mr-3" />
                            <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition duration-200"
                            >
                                <LogOut className="w-4 h-4 mr-1" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition duration-200 ${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {dataLoading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <Dashboard
                                taxCalculations={taxCalculations}
                                expenses={expenses}
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
                    </>
                )}
            </main>
        </div>
    );
};

export default ExpenseTracker;