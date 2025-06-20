import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Info, TrendingUp, DollarSign } from 'lucide-react';
import { TaxCalculatorService } from '../services/TaxCalculatorService';
import { STATES, VISA_STATUS_OPTIONS, FILING_STATUS_OPTIONS } from '../constants';
import { Input, Select, Button, Card, Alert, StatCard, Badge } from './UI';

/**
 * Paycheck Calculator Component - Single Responsibility Principle
 * Handles paycheck calculations and tax breakdown
 */
const PaycheckCalculator = ({ paycheckData, onSave }) => {
    const [formData, setFormData] = useState(paycheckData);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    const [comparisonState, setComparisonState] = useState('');

    // Update form data when props change
    useEffect(() => {
        setFormData(paycheckData);
    }, [paycheckData]);

    // Memoized tax calculations
    const taxCalculations = useMemo(() => {
        if (!formData.grossSalary || parseFloat(formData.grossSalary) <= 0) {
            return null;
        }

        return TaxCalculatorService.calculateTaxes(
            parseFloat(formData.grossSalary),
            formData.state,
            formData.visaStatus,
            formData.filingStatus
        );
    }, [formData]);

    // Memoized state comparison
    const stateComparison = useMemo(() => {
        if (!comparisonState || !formData.grossSalary || parseFloat(formData.grossSalary) <= 0) {
            return null;
        }

        return TaxCalculatorService.compareStateTaxes(
            parseFloat(formData.grossSalary),
            formData.state,
            comparisonState,
            formData.filingStatus
        );
    }, [formData.grossSalary, formData.state, comparisonState, formData.filingStatus]);

    /**
     * Validate form data
     */
    const validateForm = () => {
        const errors = {};

        if (!formData.grossSalary) {
            errors.grossSalary = 'Annual gross salary is required';
        } else if (parseFloat(formData.grossSalary) <= 0) {
            errors.grossSalary = 'Salary must be greater than 0';
        } else if (parseFloat(formData.grossSalary) > 10000000) {
            errors.grossSalary = 'Please enter a realistic salary amount';
        }

        return errors;
    };

    /**
     * Handle input changes
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
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
            await onSave(formData);
        } catch (error) {
            console.error('Error saving paycheck data:', error);
        } finally {
            setIsSubmitting(false);
        }
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
     * Format percentage
     */
    const formatPercentage = (percentage) => {
        return `${percentage.toFixed(2)}%`;
    };

    /**
     * Get visa status description
     */
    const getVisaStatusDescription = (status) => {
        const descriptions = {
            'citizen': 'Subject to all standard US taxes',
            'green_card': 'Subject to all standard US taxes',
            'h1b': 'Subject to all standard US taxes',
            'l1': 'Subject to all standard US taxes',
            'f1_opt': 'May be exempt from Social Security and Medicare taxes',
            'j1': 'May be exempt from Social Security and Medicare taxes',
            'tn': 'Subject to all standard US taxes'
        };
        return descriptions[status] || 'Tax treatment varies by status';
    };

    return (
        <div className="space-y-6">
            {/* Paycheck Calculator Form */}
            <Card title="Paycheck Calculator">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Annual Gross Salary"
                            type="number"
                            value={formData.grossSalary}
                            onChange={(e) => handleInputChange('grossSalary', e.target.value)}
                            error={formErrors.grossSalary}
                            placeholder="e.g., 75000"
                            required
                        />

                        <Select
                            label="State"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            options={STATES}
                            required
                        />

                        <Select
                            label="Visa Status"
                            value={formData.visaStatus}
                            onChange={(e) => handleInputChange('visaStatus', e.target.value)}
                            options={VISA_STATUS_OPTIONS}
                            required
                        />

                        <Select
                            label="Filing Status"
                            value={formData.filingStatus}
                            onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                            options={FILING_STATUS_OPTIONS}
                            required
                        />
                    </div>

                    {/* Visa Status Info */}
                    {formData.visaStatus && (
                        <Alert type="info">
                            <div className="flex items-start">
                                <Info className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                                <span className="text-sm">
                  {getVisaStatusDescription(formData.visaStatus)}
                </span>
                            </div>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        icon={<Calculator className="w-4 h-4" />}
                    >
                        Calculate Taxes
                    </Button>
                </form>
            </Card>

            {/* Tax Calculations Results */}
            {taxCalculations && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={DollarSign}
                            title="Monthly Gross"
                            value={formatCurrency(taxCalculations.monthlyGross)}
                            color="blue"
                        />

                        <StatCard
                            icon={TrendingUp}
                            title="Monthly Net"
                            value={formatCurrency(taxCalculations.monthlyNet)}
                            color="green"
                        />

                        <StatCard
                            icon={Calculator}
                            title="Take-Home Rate"
                            value={formatPercentage((taxCalculations.monthlyNet / taxCalculations.monthlyGross) * 100)}
                            color="purple"
                        />
                    </div>

                    {/* Detailed Tax Breakdown */}
                    <Card title="Monthly Tax Breakdown">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-lg font-medium">
                                <span>Gross Income:</span>
                                <span>{formatCurrency(taxCalculations.monthlyGross)}</span>
                            </div>

                            <hr className="border-gray-200" />

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Federal Tax:</span>
                                    <div className="text-right">
                    <span className="text-red-600 font-medium">
                      -{formatCurrency(taxCalculations.monthlyFederalTax)}
                    </span>
                                        <div className="text-sm text-gray-500">
                                            {formatPercentage(taxCalculations.effectiveFederalRate)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">State Tax ({formData.state}):</span>
                                    <div className="text-right">
                    <span className="text-red-600 font-medium">
                      -{formatCurrency(taxCalculations.monthlyStateTax)}
                    </span>
                                        <div className="text-sm text-gray-500">
                                            {formatPercentage(taxCalculations.effectiveStateRate)}
                                        </div>
                                    </div>
                                </div>

                                {formData.visaStatus !== 'f1_opt' && formData.visaStatus !== 'j1' && (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Social Security:</span>
                                            <span className="text-red-600 font-medium">
                        -{formatCurrency(taxCalculations.monthlySocialSecurity)}
                      </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Medicare:</span>
                                            <span className="text-red-600 font-medium">
                        -{formatCurrency(taxCalculations.monthlyMedicare)}
                      </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <hr className="border-gray-200" />

                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Net Income:</span>
                                <span className="text-green-600">
                  {formatCurrency(taxCalculations.monthlyNet)}
                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Total Tax Rate:</span>
                                <span>{formatPercentage(taxCalculations.effectiveTotalRate)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Annual Summary */}
                    <Card title="Annual Summary">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(taxCalculations.annualGross)}
                                </div>
                                <div className="text-sm text-gray-600">Gross Income</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                    {formatCurrency(taxCalculations.annualTotalTax)}
                                </div>
                                <div className="text-sm text-gray-600">Total Taxes</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(taxCalculations.netAnnualSalary)}
                                </div>
                                <div className="text-sm text-gray-600">Net Income</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {formatPercentage((taxCalculations.netAnnualSalary / taxCalculations.annualGross) * 100)}
                                </div>
                                <div className="text-sm text-gray-600">Take-Home Rate</div>
                            </div>
                        </div>
                    </Card>

                    {/* State Comparison Tool */}
                    <Card
                        title="State Tax Comparison"
                        headerActions={
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowComparison(!showComparison)}
                            >
                                {showComparison ? 'Hide' : 'Show'} Comparison
                            </Button>
                        }
                    >
                        {showComparison && (
                            <div className="space-y-4">
                                <Select
                                    label="Compare with State"
                                    value={comparisonState}
                                    onChange={(e) => setComparisonState(e.target.value)}
                                    options={STATES.filter(state => state.value !== formData.state)}
                                    placeholder="Select a state to compare"
                                />

                                {stateComparison && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-gray-900">
                                                Current State ({stateComparison.current.state})
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Monthly Net:</span>
                                                    <span className="font-medium">
                            {formatCurrency(stateComparison.current.monthlyNet)}
                          </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>State Tax:</span>
                                                    <span className="font-medium">
                            {formatCurrency(stateComparison.current.annualStateTax)}
                          </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total Tax Rate:</span>
                                                    <span className="font-medium">
                            {formatPercentage(stateComparison.current.effectiveTotalRate)}
                          </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="font-medium text-gray-900">
                                                Comparison State ({stateComparison.comparison.state})
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Monthly Net:</span>
                                                    <span className="font-medium">
                            {formatCurrency(stateComparison.comparison.monthlyNet)}
                          </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>State Tax:</span>
                                                    <span className="font-medium">
                            {formatCurrency(stateComparison.comparison.annualStateTax)}
                          </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total Tax Rate:</span>
                                                    <span className="font-medium">
                            {formatPercentage(stateComparison.comparison.effectiveTotalRate)}
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stateComparison && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <h5 className="font-medium text-gray-900 mb-2">Difference</h5>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span>Monthly Net Income:</span>
                                                <span className={`font-medium ${
                                                    stateComparison.difference.monthlyNetDifference >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                          {stateComparison.difference.monthlyNetDifference >= 0 ? '+' : ''}
                                                    {formatCurrency(stateComparison.difference.monthlyNetDifference)}
                        </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Annual Tax Difference:</span>
                                                <span className={`font-medium ${
                                                    stateComparison.difference.annualStateTaxDifference <= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                          {stateComparison.difference.annualStateTaxDifference >= 0 ? '+' : ''}
                                                    {formatCurrency(stateComparison.difference.annualStateTaxDifference)}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};

export default PaycheckCalculator;