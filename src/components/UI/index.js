import React from 'react';

/**
 * Reusable UI Components - Open/Closed Principle
 * These components are open for extension but closed for modification
 */

// Input Component
export const Input = ({
                          label,
                          type = 'text',
                          value,
                          onChange,
                          required = false,
                          error = null,
                          placeholder = '',
                          disabled = false,
                          className = '',
                          ...props
                      }) => (
    <div className={`mb-4 ${className}`}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
                error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
            } ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            required={required}
            {...props}
        />
        {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
    </div>
);

// Select Component
export const Select = ({
                           label,
                           value,
                           onChange,
                           options,
                           required = false,
                           error = null,
                           placeholder = 'Select an option',
                           disabled = false,
                           className = '',
                           ...props
                       }) => (
    <div className={`mb-4 ${className}`}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
                error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
            } ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            required={required}
            {...props}
        >
            <option value="">{placeholder}</option>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
        {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
    </div>
);

// Textarea Component
export const Textarea = ({
                             label,
                             value,
                             onChange,
                             required = false,
                             error = null,
                             placeholder = '',
                             disabled = false,
                             rows = 4,
                             className = '',
                             ...props
                         }) => (
    <div className={`mb-4 ${className}`}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 resize-vertical ${
                error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
            } ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            required={required}
            {...props}
        />
        {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
    </div>
);

// Card Component
export const Card = ({
                         title,
                         children,
                         className = '',
                         headerActions = null,
                         padding = 'p-6'
                     }) => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {title && (
            <div className={`border-b border-gray-200 ${padding} pb-4`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                    {headerActions && <div>{headerActions}</div>}
                </div>
            </div>
        )}
        <div className={title ? `${padding} pt-4` : padding}>
            {children}
        </div>
    </div>
);

// Button Component
export const Button = ({
                           children,
                           onClick,
                           type = 'button',
                           variant = 'primary',
                           size = 'md',
                           disabled = false,
                           loading = false,
                           className = '',
                           icon = null,
                           fullWidth = false,
                           ...props
                       }) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
        ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {!loading && icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
};

// Badge Component
export const Badge = ({
                          children,
                          variant = 'default',
                          size = 'md',
                          className = ''
                      }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-indigo-100 text-indigo-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800'
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm'
    };

    return (
        <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
    );
};

// StatCard Component
export const StatCard = ({
                             icon: Icon,
                             title,
                             value,
                             change = null,
                             changeType = 'neutral',
                             color = 'indigo',
                             className = ''
                         }) => {
    const colorClasses = {
        indigo: 'text-indigo-600',
        green: 'text-green-600',
        blue: 'text-blue-600',
        purple: 'text-purple-600',
        red: 'text-red-600',
        yellow: 'text-yellow-600'
    };

    const changeColors = {
        positive: 'text-green-600',
        negative: 'text-red-600',
        neutral: 'text-gray-600'
    };

    return (
        <Card className={className}>
            <div className="flex items-center">
                {Icon && <Icon className={`w-8 h-8 ${colorClasses[color]} mr-3 flex-shrink-0`} />}
                <div className="flex-1">
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {change && (
                        <p className={`text-sm ${changeColors[changeType]}`}>
                            {change}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
};

// Alert Component
export const Alert = ({
                          type = 'info',
                          title = null,
                          children,
                          onClose = null,
                          className = ''
                      }) => {
    const types = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };

    return (
        <div className={`border rounded-lg p-4 ${types[type]} ${className}`}>
            <div className="flex">
                <div className="flex-1">
                    {title && (
                        <h4 className="font-medium mb-1">{title}</h4>
                    )}
                    <div className={title ? 'text-sm' : ''}>{children}</div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="ml-4 text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

// Loading Spinner Component
export const LoadingSpinner = ({
                                   size = 'md',
                                   className = '',
                                   text = 'Loading...'
                               }) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizes[size]}`} />
            {text && <p className="mt-4 text-gray-600">{text}</p>}
        </div>
    );
};

// Modal Component
export const Modal = ({
                          isOpen,
                          onClose,
                          title,
                          children,
                          size = 'md',
                          className = ''
                      }) => {
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                />

                {/* Modal panel */}
                <div className={`inline-block w-full ${sizes[size]} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg ${className}`}>
                    {title && (
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};

// Pagination Component
export const Pagination = ({
                               currentPage,
                               totalPages,
                               onPageChange,
                               showInfo = true,
                               className = ''
                           }) => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className={`flex items-center justify-between ${className}`}>
            {showInfo && (
                <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                </div>
            )}

            <div className="flex space-x-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    Previous
                </Button>

                {pages.map(page => (
                    <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </Button>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};