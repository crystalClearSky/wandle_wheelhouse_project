// src/components/ui/Button.tsx
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      ...props
    },
    ref
  ) => {
    const baseStyle =
      "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";

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
      case "outline":
        variantStyle =
          "bg-transparent text-indigo-700 border border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500";
        break;
      case "primary":
      default:
        variantStyle =
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
        break;
    }

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variantStyle} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;