// src/components/ui/Textarea.tsx
import React, { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    id: string;
    error?: string; // Optional error message for field-specific errors
}

const Textarea: React.FC<TextareaProps> = ({
    label,
    id,
    name,
    value,
    onChange,
    placeholder,
    required,
    disabled,
    rows = 4, // Default number of rows
    className = '',
    error,
    ...props
}) => {
    const baseClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100";
    const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                className={`${baseClasses} ${errorClasses} ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default Textarea;