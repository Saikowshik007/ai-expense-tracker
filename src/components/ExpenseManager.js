import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { CATEGORIES, EXPENSE_TYPES, FORM_DEFAULTS } from '../constants';
import { ExpenseCalculatorService } from '../services/ExpenseCalculatorService';
import { Input, Select, Button, Card, Modal, Alert, Badge, Pagination } from './UI';

/**
 * Expense Manager Component - Single Responsibility Principle
 * Handles expense CRUD operations and filtering
 */
const ExpenseManager = ({ expenses, onSave, onDelete }) => {
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [expenseForm, setExpenseForm] = useState(FORM_DEFAULTS.EXPENSE);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtering and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Memoized filtered and sorted expenses
    const filteredExpenses = useMemo(() => {
        let filtered = expenses.filter(expense => {
            // Search filter
            if (searchTerm && !expense.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // Category filter
            if (filterCategory && expense.category !== filterCategory) {
                return false;
            }

            // Type filter
            if (filterType && expense.type !== filterType) {
                return false;
            }

            // Date range filter
            if (filterDateRange.start || filterDateRange.end) {
                const expenseDate = new Date(expense.date);
                if (filterDateRange.start && expenseDate < new Date(filterDateRange.start)) {
                    return false;
                }
                if (filterDateRange.end && expenseDate > new Date(filterDateRange.end)) {
                    return false;
                }
            }

            return true;
        });

        // Sort expenses
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                case 'type':
                    aValue = a.type;
                    bValue = b.type;
                    break;
                case 'date':
                default:
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
                    break;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [expenses, searchTerm, filterCategory, filterType, filterDateRange, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

    // Summary calculations
    const expenseSummary = useMemo(() => {
        const total = ExpenseCalculatorService.calculateTotalExpenses(filteredExpenses);
        const byCategory = ExpenseCalculatorService.getExpensesByCategory(filteredExpenses);
        const byType = ExpenseCalculatorService.getExpensesByType(filteredExpenses);

        return { total, byCategory, byType };
    }, [filteredExpenses]);

    /**
     * Validate expense form
     */
    const validateForm = () => {
        const errors = {};

        if (!expenseForm.name.trim()) {
            errors.name = 'Expense name is required';
        }

        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }

        if (!expenseForm.category) {
            errors.category = 'Category is required';
        }

        if (!expenseForm.date) {
            errors.date = 'Date is required';
        }

        return errors;
    };

    /**
     * Handle form input changes
     */
    const handleInputChange = (field, value) => {
        setExpenseForm(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear field error
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);

        try {
            await onSave(expenseForm, editingExpense?.id || null);

            // Reset form
            setExpenseForm(FORM_DEFAULTS.EXPENSE);
            setShowExpenseForm(false);
            setEditingExpense(null);
            setFormErrors({});
        } catch (error) {
            console.error('Error saving expense:', error);
            setFormErrors({ submit: 'Failed to save expense. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle edit expense
     */
    const handleEditExpense = (expense) => {
        setExpenseForm({
            name: expense.name,
            amount: expense.amount.toString(),
            type: expense.type,
            category: expense.category,
            date: expense.date instanceof Date
                ? expense.date.toISOString().split('T')[0]
                : new Date(expense.date).toISOString().split('T')[0]
        });
        setEditingExpense(expense);
        setShowExpenseForm(true);
    };

    /**
     * Handle delete expense
     */
    const handleDeleteExpense = async (expenseId) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await onDelete(expenseId);
            } catch (error) {
                console.error('Error deleting expense:', error);
            }
        }
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        setSearchTerm('');
        setFilterCategory('');
        setFilterType('');
        setFilterDateRange({ start: '', end: '' });
        setSortBy('date');
        setSortOrder('desc');
        setCurrentPage(1);
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
     * Format date
     */
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
                <Button
                    onClick={() => setShowExpenseForm(true)}
                    icon={<Plus className="w-4 h-4" />}
                >
                    Add Expense
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(expenseSummary.total)}
                        </div>
                        <div className="text-sm text-gray-600">Total Expenses</div>
                    </div>
                </Card>

                <Card>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {filteredExpenses.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Items</div>
                    </div>
                </Card>

                <Card>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {filteredExpenses.length > 0
                                ? formatCurrency(expenseSummary.total / filteredExpenses.length)
                                : '$0'
                            }
                        </div>
                        <div className="text-sm text-gray-600">Average Amount</div>
                    </div>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        options={[{ value: '', label: 'All Categories' }, ...CATEGORIES]}
                        placeholder="Filter by category"
                    />

                    <Select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        options={[{ value: '', label: 'All Types' }, ...EXPENSE_TYPES]}
                        placeholder="Filter by type"
                    />

                    <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        options={[
                            { value: 'date', label: 'Sort by Date' },
                            { value: 'amount', label: 'Sort by Amount' },
                            { value: 'name', label: 'Sort by Name' },
                            { value: 'category', label: 'Sort by Category' }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Start Date"
                        type="date"
                        value={filterDateRange.start}
                        onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />

                    <Input
                        label="End Date"
                        type="date"
                        value={filterDateRange.end}
                        onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />

                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="w-full"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Expenses List */}
            <Card title={`Expenses (${filteredExpenses.length})`}>
                {paginatedExpenses.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                            <Calendar className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                        <p className="text-gray-600 mb-4">
                            {expenses.length === 0
                                ? "Start by adding your first expense."
                                : "Try adjusting your filters or search terms."
                            }
                        </p>
                        <Button onClick={() => setShowExpenseForm(true)}>
                            Add Your First Expense
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {paginatedExpenses.map((expense) => (
                                <div key={expense.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{expense.name}</h4>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditExpense(expense)}
                                                icon={<Edit2 className="w-3 h-3" />}
                                            />
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                icon={<Trash2 className="w-3 h-3" />}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-indigo-600 mb-2">
                                        {formatCurrency(expense.amount)}
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                        <div className="flex space-x-2">
                                            <Badge variant="default">{expense.category}</Badge>
                                            <Badge variant="outline">{expense.type}</Badge>
                                        </div>
                                        <span>{formatDate(expense.date)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paginatedExpenses.map((expense) => (
                                    <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{expense.name}</td>
                                        <td className="py-3 px-4 text-indigo-600 font-medium">
                                            {formatCurrency(expense.amount)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant="default">{expense.category}</Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline">{expense.type}</Badge>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{formatDate(expense.date)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditExpense(expense)}
                                                    icon={<Edit2 className="w-3 h-3" />}
                                                />
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    icon={<Trash2 className="w-3 h-3" />}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Expense Form Modal */}
            <Modal
                isOpen={showExpenseForm}
                onClose={() => {
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                    setExpenseForm(FORM_DEFAULTS.EXPENSE);
                    setFormErrors({});
                }}
                title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Expense Name"
                        value={expenseForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        error={formErrors.name}
                        placeholder="e.g., Groceries, Gas, Rent"
                        required
                    />

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        error={formErrors.amount}
                        placeholder="0.00"
                        required
                    />

                    <Select
                        label="Category"
                        value={expenseForm.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        options={CATEGORIES}
                        error={formErrors.category}
                        required
                    />

                    <Select
                        label="Type"
                        value={expenseForm.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        options={EXPENSE_TYPES}
                        required
                    />

                    <Input
                        label="Date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        error={formErrors.date}
                        required
                    />

                    {formErrors.submit && (
                        <Alert type="error">
                            {formErrors.submit}
                        </Alert>
                    )}

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            fullWidth
                        >
                            {editingExpense ? 'Update Expense' : 'Add Expense'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowExpenseForm(false);
                                setEditingExpense(null);
                                setExpenseForm(FORM_DEFAULTS.EXPENSE);
                                setFormErrors({});
                            }}
                            fullWidth
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ExpenseManager;