import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string; // Required for associating label
  error?: string; // Optional error message display
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  className = '',
  ...props // Pass down other input attributes (type, name, value, onChange, etc.)
}) => {
  const errorStyle = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
  const baseStyle = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${errorStyle}`;

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
        {...props}
      />
      {error && (
         <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;