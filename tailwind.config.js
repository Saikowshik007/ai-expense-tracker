/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                },
                success: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
                danger: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                },
            },
            spacing: {
                '72': '18rem',
                '84': '21rem',
                '96': '24rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.5s ease-out',
                'slide-in-right': 'slideInRight 0.5s ease-out',
                'slide-in-left': 'slideInLeft 0.5s ease-out',
                'bounce-gentle': 'bounceGentle 2s infinite',
                'pulse-gentle': 'pulseGentle 2s infinite',
                'wiggle': 'wiggle 1s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                bounceGentle: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                pulseGentle: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                },
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'medium': '0 4px 25px -3px rgba(0, 0, 0, 0.1), 0 10px 20px -2px rgba(0, 0, 0, 0.05)',
                'hard': '0 10px 40px -3px rgba(0, 0, 0, 0.15), 0 10px 20px -2px rgba(0, 0, 0, 0.1)',
            },
            backdropBlur: {
                xs: '2px',
            },
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
                '5xl': ['3rem', { lineHeight: '1' }],
                '6xl': ['3.75rem', { lineHeight: '1' }],
                '7xl': ['4.5rem', { lineHeight: '1' }],
                '8xl': ['6rem', { lineHeight: '1' }],
                '9xl': ['8rem', { lineHeight: '1' }],
            },
            maxWidth: {
                '8xl': '88rem',
                '9xl': '96rem',
            },
            zIndex: {
                '60': '60',
                '70': '70',
                '80': '80',
                '90': '90',
                '100': '100',
            },
        },
    },
    plugins: [
        // Add forms plugin for better form styling
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        // Add typography plugin for better text styling
        require('@tailwindcss/typography'),
        // Add aspect ratio plugin
        require('@tailwindcss/aspect-ratio'),
        // Custom plugin for additional utilities
        function({ addUtilities, addComponents, theme }) {
            // Add custom utilities
            addUtilities({
                '.text-balance': {
                    'text-wrap': 'balance',
                },
                '.text-pretty': {
                    'text-wrap': 'pretty',
                },
                '.scrollbar-hide': {
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                },
                '.scrollbar-thin': {
                    'scrollbar-width': 'thin',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: theme('colors.gray.100'),
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: theme('colors.gray.300'),
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: theme('colors.gray.400'),
                    },
                },
            });

            // Add custom components
            addComponents({
                '.btn': {
                    padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
                    borderRadius: theme('borderRadius.md'),
                    fontWeight: theme('fontWeight.medium'),
                    fontSize: theme('fontSize.sm')[0],
                    lineHeight: theme('fontSize.sm')[1].lineHeight,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:focus': {
                        outline: 'none',
                        ringWidth: '2px',
                        ringColor: theme('colors.primary.500'),
                        ringOffsetWidth: '2px',
                    },
                    '&:disabled': {
                        opacity: '0.5',
                        cursor: 'not-allowed',
                    },
                },
                '.btn-primary': {
                    backgroundColor: theme('colors.primary.600'),
                    color: theme('colors.white'),
                    '&:hover:not(:disabled)': {
                        backgroundColor: theme('colors.primary.700'),
                    },
                },
                '.btn-secondary': {
                    backgroundColor: theme('colors.gray.200'),
                    color: theme('colors.gray.800'),
                    '&:hover:not(:disabled)': {
                        backgroundColor: theme('colors.gray.300'),
                    },
                },
                '.btn-outline': {
                    backgroundColor: 'transparent',
                    borderWidth: '2px',
                    borderColor: theme('colors.primary.600'),
                    color: theme('colors.primary.600'),
                    '&:hover:not(:disabled)': {
                        backgroundColor: theme('colors.primary.50'),
                    },
                },
                '.card': {
                    backgroundColor: theme('colors.white'),
                    borderRadius: theme('borderRadius.lg'),
                    boxShadow: theme('boxShadow.sm'),
                    borderWidth: '1px',
                    borderColor: theme('colors.gray.200'),
                },
                '.input': {
                    width: '100%',
                    padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
                    borderWidth: '1px',
                    borderColor: theme('colors.gray.300'),
                    borderRadius: theme('borderRadius.md'),
                    fontSize: theme('fontSize.sm')[0],
                    lineHeight: theme('fontSize.sm')[1].lineHeight,
                    transition: 'all 0.2s ease-in-out',
                    '&:focus': {
                        outline: 'none',
                        ringWidth: '2px',
                        ringColor: theme('colors.primary.500'),
                        borderColor: 'transparent',
                    },
                    '&::placeholder': {
                        color: theme('colors.gray.400'),
                    },
                },
                '.input-error': {
                    borderColor: theme('colors.red.300'),
                    '&:focus': {
                        ringColor: theme('colors.red.500'),
                    },
                },
                '.loading-spinner': {
                    width: theme('spacing.8'),
                    height: theme('spacing.8'),
                    borderWidth: '2px',
                    borderColor: theme('colors.gray.200'),
                    borderTopColor: theme('colors.primary.600'),
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                },
            });
        },
    ],
    // Enable dark mode support (class-based)
    darkMode: 'class',
    // Optimize for production
    future: {
        hoverOnlyWhenSupported: true,
    },
};