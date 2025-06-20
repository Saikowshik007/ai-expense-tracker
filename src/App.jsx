import React, { useState, useMemo } from 'react';
import { Calculator, LogOut, User } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { TaxCalculatorService } from './services/TaxCalculatorService';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import PaycheckCalculator from './components/PaycheckCalculator';
import ExpenseManager from './components/ExpenseManager';
import { LoadingSpinner } from './components/UI';

const App = () => {
    const {
        user,
        loading: authLoading,
        signOutUser,
        userDisplayName,
        userPhotoURL,
        isGoogleUser
    } = useAuth();
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
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner text="Loading Expense Tracker..." />
            </div>
        );
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
                            {/* User Info */}
                            <div className="flex items-center space-x-3">
                                {/* User Avatar */}
                                <div className="flex-shrink-0">
                                    {userPhotoURL ? (
                                        <img
                                            className="h-8 w-8 rounded-full"
                                            src={userPhotoURL}
                                            alt={userDisplayName}
                                            onError={(e) => {
                                                // Fallback to default avatar if image fails to load
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ${userPhotoURL ? 'hidden' : 'flex'}`}
                                    >
                                        <User className="h-5 w-5 text-indigo-600" />
                                    </div>
                                </div>

                                {/* User Name and Email */}
                                <div className="hidden sm:block">
                                    <div className="text-sm font-medium text-gray-900">
                                        {userDisplayName}
                                    </div>
                                    {isGoogleUser && (
                                        <div className="text-xs text-gray-500">
                                            Signed in with Google
                                        </div>
                                    )}
                                </div>

                                {/* Mobile: Just email */}
                                <div className="sm:hidden">
                  <span className="text-sm text-gray-600">
                    {userDisplayName.length > 20
                        ? `${userDisplayName.substring(0, 20)}...`
                        : userDisplayName
                    }
                  </span>
                                </div>
                            </div>

                            {/* Sign Out Button */}
                            <button
                                onClick={handleSignOut}
                                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition duration-200 px-3 py-2 rounded-md hover:bg-gray-100"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4 mr-1" />
                                <span className="hidden sm:block">Sign Out</span>
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
                    <div className="flex justify-center">
                        <LoadingSpinner text="Loading your data..." />
                    </div>
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

export default App;