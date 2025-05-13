// src/components/ui/Select.tsx
import React, { SelectHTMLAttributes } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    id: string;
    options: Option[];
    error?: string; // Optional error message
}

const Select: React.FC<SelectProps> = ({
    label,
    id,
    name,
    value,
    onChange,
    options,
    required,
    disabled,
    className = '',
    error,
    ...props
}) => {
    const baseClasses = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:opacity-50 disabled:bg-gray-100";
    const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300";


    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                className={`${baseClasses} ${errorClasses} ${className}`}
                {...props}
            >
                {/* Optional: Add a default disabled option if value can be initially empty */}
                {/* <option value="" disabled={required}>Please select...</option> */}
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default Select;