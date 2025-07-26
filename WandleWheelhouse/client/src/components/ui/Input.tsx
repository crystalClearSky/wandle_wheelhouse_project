// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string; // Required for associating label with input
  error?: string; // Optional error message display
  className?: string; // Allow custom className for additional styling
  placeholder?: string; // Explicit placeholder prop
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  className = '',
  placeholder,
  disabled,
  ...props
}) => {
  const errorStyle = error
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : '';
  const baseStyle = `block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${errorStyle} ${disabledStyle}`;

  // Generate a unique ID for the error message to associate with aria-describedby
  const errorId = `${id}-error`;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`${baseStyle} ${className}`}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;