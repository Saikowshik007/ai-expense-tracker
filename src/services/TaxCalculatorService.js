import { TAX_CONSTANTS } from '../constants';

/**
 * Tax Calculator Service - Single Responsibility Principle
 * Handles all tax-related calculations
 */
export class TaxCalculatorService {
    /**
     * Calculate comprehensive tax breakdown
     * @param {number} grossSalary - Annual gross salary
     * @param {string} state - State abbreviation
     * @param {string} visaStatus - Visa status (affects tax calculations)
     * @param {string} filingStatus - Tax filing status
     * @returns {object} Tax calculation breakdown
     */
    static calculateTaxes(grossSalary, state, visaStatus, filingStatus = 'single') {
        const annualGross = parseFloat(grossSalary);
        const monthlyGross = annualGross / 12;

        const federalTax = this.calculateFederalTax(annualGross, filingStatus);
        const { socialSecurity, medicare, additionalMedicare } = this.calculatePayrollTaxes(annualGross);
        const stateTax = this.calculateStateTax(annualGross, state);

        // Some visa holders may have different tax treatments
        const adjustedTaxes = this.applyVisaStatusAdjustments(
            { federalTax, socialSecurity, medicare, additionalMedicare, stateTax },
            visaStatus
        );

        const totalAnnualTax = Object.values(adjustedTaxes).reduce((sum, tax) => sum + tax, 0);
        const netAnnualSalary = annualGross - totalAnnualTax;
        const monthlyNet = netAnnualSalary / 12;

        return {
            // Monthly values
            monthlyGross,
            monthlyNet,
            monthlyFederalTax: adjustedTaxes.federalTax / 12,
            monthlyStateTax: adjustedTaxes.stateTax / 12,
            monthlySocialSecurity: adjustedTaxes.socialSecurity / 12,
            monthlyMedicare: (adjustedTaxes.medicare + adjustedTaxes.additionalMedicare) / 12,
            monthlyTotalTax: totalAnnualTax / 12,

            // Annual values
            annualGross,
            netAnnualSalary,
            annualFederalTax: adjustedTaxes.federalTax,
            annualStateTax: adjustedTaxes.stateTax,
            annualSocialSecurity: adjustedTaxes.socialSecurity,
            annualMedicare: adjustedTaxes.medicare + adjustedTaxes.additionalMedicare,
            annualTotalTax: totalAnnualTax,

            // Tax rate information
            effectiveFederalRate: (adjustedTaxes.federalTax / annualGross) * 100,
            effectiveStateRate: (adjustedTaxes.stateTax / annualGross) * 100,
            effectiveTotalRate: (totalAnnualTax / annualGross) * 100
        };
    }

    /**
     * Calculate federal income tax using progressive brackets
     * @param {number} grossSalary - Annual gross salary
     * @param {string} filingStatus - Tax filing status
     * @returns {number} Annual federal tax
     */
    static calculateFederalTax(grossSalary, filingStatus) {
        const brackets = TAX_CONSTANTS.FEDERAL_BRACKETS[filingStatus] || TAX_CONSTANTS.FEDERAL_BRACKETS.single;
        let federalTax = 0;
        let remainingIncome = grossSalary;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;

            const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
            federalTax += taxableInBracket * bracket.rate;
            remainingIncome -= taxableInBracket;
        }

        return federalTax;
    }

    /**
     * Calculate payroll taxes (Social Security and Medicare)
     * @param {number} grossSalary - Annual gross salary
     * @returns {object} Payroll tax breakdown
     */
    static calculatePayrollTaxes(grossSalary) {
        const socialSecurity = Math.min(
            grossSalary * TAX_CONSTANTS.SOCIAL_SECURITY_RATE,
            TAX_CONSTANTS.SOCIAL_SECURITY_CAP * TAX_CONSTANTS.SOCIAL_SECURITY_RATE
        );

        const medicare = grossSalary * TAX_CONSTANTS.MEDICARE_RATE;

        const additionalMedicare = grossSalary > TAX_CONSTANTS.ADDITIONAL_MEDICARE_THRESHOLD
            ? (grossSalary - TAX_CONSTANTS.ADDITIONAL_MEDICARE_THRESHOLD) * TAX_CONSTANTS.ADDITIONAL_MEDICARE_RATE
            : 0;

        return { socialSecurity, medicare, additionalMedicare };
    }

    /**
     * Calculate state income tax
     * @param {number} grossSalary - Annual gross salary
     * @param {string} state - State abbreviation
     * @returns {number} Annual state tax
     */
    static calculateStateTax(grossSalary, state) {
        const stateRate = TAX_CONSTANTS.STATE_TAX_RATES[state] || 0;
        return grossSalary * stateRate;
    }

    /**
     * Apply visa-specific tax adjustments
     * @param {object} taxes - Calculated taxes
     * @param {string} visaStatus - Visa status
     * @returns {object} Adjusted taxes
     */
    static applyVisaStatusAdjustments(taxes, visaStatus) {
        // Most visa holders pay the same taxes as citizens
        // Some specific cases might have different treatments
        switch (visaStatus) {
            case 'f1_opt':
                // F1 OPT students may be exempt from Social Security/Medicare for first 5 years
                // This is a simplified implementation - real calculations are more complex
                return {
                    ...taxes,
                    socialSecurity: 0,
                    medicare: 0,
                    additionalMedicare: 0
                };

            case 'j1':
                // J1 visitors may have different tax treaties
                return {
                    ...taxes,
                    socialSecurity: 0,
                    medicare: 0,
                    additionalMedicare: 0
                };

            default:
                return taxes;
        }
    }

    /**
     * Calculate take-home pay percentage
     * @param {number} grossSalary - Annual gross salary
     * @param {number} netSalary - Annual net salary
     * @returns {number} Take-home percentage
     */
    static calculateTakeHomePercentage(grossSalary, netSalary) {
        return (netSalary / grossSalary) * 100;
    }

    /**
     * Calculate tax burden comparison between states
     * @param {number} grossSalary - Annual gross salary
     * @param {string} currentState - Current state
     * @param {string} comparisonState - State to compare
     * @param {string} filingStatus - Tax filing status
     * @returns {object} Comparison results
     */
    static compareStateTaxes(grossSalary, currentState, comparisonState, filingStatus = 'single') {
        const currentCalculation = this.calculateTaxes(grossSalary, currentState, 'citizen', filingStatus);
        const comparisonCalculation = this.calculateTaxes(grossSalary, comparisonState, 'citizen', filingStatus);

        return {
            current: {
                state: currentState,
                monthlyNet: currentCalculation.monthlyNet,
                annualStateTax: currentCalculation.annualStateTax,
                effectiveTotalRate: currentCalculation.effectiveTotalRate
            },
            comparison: {
                state: comparisonState,
                monthlyNet: comparisonCalculation.monthlyNet,
                annualStateTax: comparisonCalculation.annualStateTax,
                effectiveTotalRate: comparisonCalculation.effectiveTotalRate
            },
            difference: {
                monthlyNetDifference: comparisonCalculation.monthlyNet - currentCalculation.monthlyNet,
                annualStateTaxDifference: comparisonCalculation.annualStateTax - currentCalculation.annualStateTax,
                effectiveRateDifference: comparisonCalculation.effectiveTotalRate - currentCalculation.effectiveTotalRate
            }
        };
    }
}