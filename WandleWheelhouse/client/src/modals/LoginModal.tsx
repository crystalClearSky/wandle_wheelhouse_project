import { ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, { FormEvent, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/AuthService";

interface LoginModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSwitchToRegister?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onRequestClose,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const loginDto = { email, password };
      const response = await AuthService.login(loginDto);

      if (response.token && response.userInfo) {
        login(response.token, response.userInfo);
        onRequestClose();
        setEmail("");
        setPassword("");
      } else {
        setError(response.message || "Login failed: Unexpected response.");
      }
    } catch (err: unknown) {
      let message = "An unexpected error occurred during login.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsLoading(false);
    setEmail("");
    setPassword("");
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      title="Log In to Your Account"
    >
      <div className="relative bg-white rounded-xl sm:p-4 max-w-lg w-full mx-0 sm:mx-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-colors duration-200"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Modal Header */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center">
          Log In
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2"
              role="alert"
            >
              <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <Input
              label="Email Address"
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com"
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>

          {/* Password Input */}
          <div>
            <Input
              label="Password"
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col items-center">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {isLoading ? "Logging In..." : "Log In"}
            </Button>
          </div>
        </form>

        {/* Links */}
        <div className="text-sm mt-6 text-center">
          {onSwitchToRegister && (
            <p>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none transition-colors duration-200"
                disabled={isLoading}
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;
