import React, { useState, FormEvent } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthService from '../services/AuthService';
import { RegisterDto } from '../dto/Auth/RegisterDto';
import { ExclamationCircleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RegisterModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSwitchToLogin?: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onRequestClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterDto>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await AuthService.register(formData);

      if (response.isSuccess) {
        setSuccessMessage(response.message || 'Registration successful! You can now log in.');
        setTimeout(() => {
          setFormData({ firstName: '', lastName: '', email: '', password: '' });
          setConfirmPassword('');
          setError(null);
          setIsLoading(false);
          if (onSwitchToLogin) {
            onSwitchToLogin();
          } else {
            onRequestClose();
          }
        }, 1500);
      } else {
        setError(response.message || 'Registration failed: Unexpected response.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      let message = 'An unexpected error occurred during registration.';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onRequestClose();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} title="Register New Account">
      <div className="relative bg-white rounded-xl  sm:p-4 max-w-lg w-full mx-4 sm:mx-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-colors duration-200"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Modal Header */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
          Register
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
          {/* Success Alert */}
          {successMessage && (
            <div
              className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2"
              role="alert"
            >
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <Input
              label="First Name"
              id="reg-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
            <Input
              label="Last Name"
              id="reg-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
            />
          </div>
          <Input
            label="Email Address"
            id="reg-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <Input
            label="Password"
            id="reg-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="Min 6 characters"
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
          <Input
            label="Confirm Password"
            id="reg-confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />

          {/* Submit Button and Links */}
          <div className="mt-6 flex flex-col items-center">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105 flex items-center justify-center"
            >
              {isLoading ? (
                <>
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
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
            {onSwitchToLogin && (
              <p className="mt-4 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none transition-colors duration-200"
                  disabled={isLoading}
                >
                  Login here
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default RegisterModal;