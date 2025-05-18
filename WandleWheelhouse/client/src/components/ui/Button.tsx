// src/components/ui/Button.tsx
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline"; // <-- Added "outline"
  // Add other variants as needed (e.g., link)
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary", // Default variant remains "primary"
  ...props // Pass down other button attributes like type, onClick, disabled
}) => {
  // Base styles - these are good and apply to all variants
  const baseStyle =
    "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"; // Added inline-flex and justify-center for icon alignment if children include them

  // Variant styles
  let variantStyle = "";
  switch (variant) {
    case "secondary":
      variantStyle =
        "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500";
      break;
    case "danger":
      variantStyle =
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500";
      break;
    case "outline": // <-- ADDED NEW CASE FOR "outline" VARIANT
      variantStyle =
        "bg-transparent text-indigo-700 border border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500";
      // For a more neutral outline, you could use:
      // "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-100 focus:ring-indigo-500";
      break;
    case "primary":
    default:
      variantStyle =
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
      // Consider changing your primary to indigo to match the outline and other theme elements:
      // "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500";
      break;
  }

  return (
    <button
      // type="button" // Consider defaulting to "button" if not explicitly passed in props
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;