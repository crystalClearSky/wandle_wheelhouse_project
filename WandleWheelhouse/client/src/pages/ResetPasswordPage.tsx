import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthService, { ResetPasswordRequestDto } from '../services/AuthService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setLoginEmail } = useAuth();

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid password reset link. Token or email is missing from the URL.");
    }
  }, [token, email]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    if (!token || !email) {
      setError("Invalid or expired reset link. Please request a new one.");
      setIsLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    const data: ResetPasswordRequestDto = {
      email: decodeURIComponent(email),
      token: token,
      newPassword,
      confirmPassword,
    };

    try {
      const response = await AuthService.resetPassword(data);
      if (response.isSuccess === false) {
        throw new Error(response.message || "Password reset failed.");
      }
      setMessage(response.message || "Your password has been reset successfully. You can now log in.");
      setNewPassword('');
      setConfirmPassword('');
      setLoginEmail(decodeURIComponent(email));
      navigate('/', { state: { openLoginModal: true } });
    } catch (err: unknown) {
      let displayMessage = "Failed to reset password. The link may be invalid/expired or the new password doesn't meet requirements.";
      if (err instanceof Error) {
        displayMessage = err.message;
      }
      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (email) {
      setLoginEmail(decodeURIComponent(email));
    }
    navigate('/', { state: { openLoginModal: true } });
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8">
            <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900 text-center">Invalid Link</h2>
            <p className="mt-4 text-lg text-gray-600 text-center">
              {error || "The password reset link is invalid or incomplete. Please request a new one if needed."}
            </p>
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="inline-block text-base font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <img
            className="mx-auto h-16 w-auto"
            src="/logo_transparent.png"
            alt="Wandle Wheelhouse"
          />
          <h1 className="mt-6 text-4xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Enter a new password for <span className="font-medium">{decodeURIComponent(email || '')}</span> to regain access to your account.
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          {message && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 text-green-700 p-4 rounded-md" role="alert">
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <p className="font-bold">Success!</p>
                  <p>{message}</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <div className="flex items-center">
                <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-3" />
                <div>
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {!message && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="New Password"
                id="new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter new password"
                className="text-lg py-3"
              />
              <Input
                label="Confirm New Password"
                id="confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Confirm new password"
                className="text-lg py-3"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full text-lg py-3"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleBackToLogin}
              className="text-base font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;