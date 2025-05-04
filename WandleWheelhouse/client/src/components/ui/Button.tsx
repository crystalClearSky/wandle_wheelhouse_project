import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  // Add other variants as needed (e.g., outline, link)
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  ...props // Pass down other button attributes like type, onClick, disabled
}) => {
  // Base styles
  const baseStyle =
    "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

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
    case "primary":
    default:
      variantStyle =
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
      break;
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
