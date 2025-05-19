import { ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, { FormEvent, useState, useEffect } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/AuthService";
import axios from 'axios';

interface LoginModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSwitchToRegister?: () => void;
  initialEmail?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onRequestClose,
  onSwitchToRegister,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, openAuthModal } = useAuth();

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const loginDto = { email, password };
      const response = await AuthService.login(loginDto);
      if (response.token && response.userInfo) {
        login(response.token, response.userInfo);
        handleFullClose();
      } else {
        setError(response.message || "Login failed: Unexpected response.");
      }
    } catch (err: unknown) {
      let message = "An unexpected error occurred during login.";
      if (axios.isAxiosError(err) && err.response) {
        message = err.response.data?.message || err.response.data?.title || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullClose = () => {
    setError(null);
    setIsLoading(false);
    setEmail("");
    setPassword("");
    onRequestClose();
  };

  const handleForgotPasswordClick = () => {
    openAuthModal('forgotPassword');
  };

  const handleSwitchToRegisterClick = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleFullClose}
      title="Log In to Your Account"
    >
      <div className="relative bg-white rounded-xl p-6 sm:p-8 max-w-lg w-full mx-auto">
        <button
          onClick={handleFullClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center">
          Log In
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2" role="alert">
              <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}
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
            />
          </div>
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
            />
            <div className="text-xs text-right mt-1">
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-3 px-4 flex items-center justify-center"
            >
              {isLoading && ( <svg className="animate-spin h-5 w-5 mr-2 text-white" /* ... spinner svg ... */ ></svg> )}
              {isLoading ? "Logging In..." : "Log In"}
            </Button>
          </div>
        </form>
        <div className="text-sm mt-6 text-center">
          {onSwitchToRegister && (
            <p> Don’t have an account?{" "}
              <button
                type="button"
                onClick={handleSwitchToRegisterClick}
                className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none"
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