// Tax calculation constants
export const TAX_CONSTANTS = {
    FEDERAL_BRACKETS: {
        single: [
            { min: 0, max: 11000, rate: 0.10 },
            { min: 11000, max: 44725, rate: 0.12 },
            { min: 44725, max: 95375, rate: 0.22 },
            { min: 95375, max: 182050, rate: 0.24 },
            { min: 182050, max: 231250, rate: 0.32 },
            { min: 231250, max: 578125, rate: 0.35 },
            { min: 578125, max: Infinity, rate: 0.37 }
        ],
        married: [
            { min: 0, max: 22000, rate: 0.10 },
            { min: 22000, max: 89450, rate: 0.12 },
            { min: 89450, max: 190750, rate: 0.22 },
            { min: 190750, max: 364200, rate: 0.24 },
            { min: 364200, max: 462500, rate: 0.32 },
            { min: 462500, max: 693750, rate: 0.35 },
            { min: 693750, max: Infinity, rate: 0.37 }
        ]
    },
    STATE_TAX_RATES: {
        'CA': 0.08,
        'NY': 0.065,
        'TX': 0,
        'FL': 0,
        'WA': 0,
        'IL': 0.0495,
        'PA': 0.0307,
        'OH': 0.0399,
        'MI': 0.0425,
        'GA': 0.0575,
        'NC': 0.0525,
        'NJ': 0.0637,
        'VA': 0.0575,
        'CO': 0.0455,
        'AZ': 0.025,
        'NV': 0,
        'OR': 0.075,
        'UT': 0.0495,
        'TN': 0,
        'AL': 0.05
    },
    SOCIAL_SECURITY_RATE: 0.062,
    MEDICARE_RATE: 0.0145,
    ADDITIONAL_MEDICARE_RATE: 0.009,
    SOCIAL_SECURITY_CAP: 160200, // 2023 cap
    ADDITIONAL_MEDICARE_THRESHOLD: 200000
};

// Form default values
export const FORM_DEFAULTS = {
    PAYCHECK: {
        grossSalary: '',
        state: 'CA',
        visaStatus: 'citizen',
        filingStatus: 'single'
    },
    EXPENSE: {
        name: '',
        amount: '',
        type: 'fixed',
        category: 'housing',
        date: new Date().toISOString().split('T')[0]
    }
};

// Dropdown options
export const CATEGORIES = [
    { value: 'housing', label: 'Housing' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'food', label: 'Food & Dining' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'education', label: 'Education' },
    { value: 'savings', label: 'Savings & Investments' },
    { value: 'debt', label: 'Debt Payments' },
    { value: 'other', label: 'Other' }
];

export const STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'IL', label: 'Illinois' },
    { value: 'MI', label: 'Michigan' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NY', label: 'New York' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' }
];

export const VISA_STATUS_OPTIONS = [
    { value: 'citizen', label: 'US Citizen' },
    { value: 'green_card', label: 'Green Card' },
    { value: 'h1b', label: 'H1B' },
    { value: 'l1', label: 'L1' },
    { value: 'f1_opt', label: 'F1 OPT' },
    { value: 'j1', label: 'J1' },
    { value: 'tn', label: 'TN' }
];

export const FILING_STATUS_OPTIONS = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married Filing Jointly' },
    { value: 'married_separate', label: 'Married Filing Separately' },
    { value: 'head', label: 'Head of Household' }
];

export const EXPENSE_TYPES = [
    { value: 'fixed', label: 'Fixed' },
    { value: 'recurring', label: 'Recurring' },
    { value: 'one_time', label: 'One Time' }
];