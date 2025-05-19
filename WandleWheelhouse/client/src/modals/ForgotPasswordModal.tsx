// src/modals/ForgotPasswordModal.tsx
import React, { useState, FormEvent } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Modal from '../components/ui/Modal'; // Your generic Modal component
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthService, { ForgotPasswordRequestDto } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext'; // To switch to login modal

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    onSwitchToLogin?: () => void; // To go back to login modal
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
    isOpen,
    onRequestClose,
    onSwitchToLogin,
}) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { openAuthModal } = useAuth();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage(null);
        setError(null);
        const data: ForgotPasswordRequestDto = { email };
        try {
            const response = await AuthService.forgotPassword(data);
            setMessage(response.message || "If an account with this email exists, a password reset link has been sent.");
            setEmail(''); // Clear form on success message
        } catch (err: unknown) { // <-- UPDATED error typing
            let displayMessage = "Failed to process request. Please try again.";
            if (err instanceof Error) {
                displayMessage = err.message;
            }
            setError(displayMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail(''); setIsLoading(false); setMessage(null); setError(null);
        onRequestClose();
    };
    
    const switchToLogin = () => {
        handleClose(); 
        if (onSwitchToLogin) {
            onSwitchToLogin(); 
        } else {
            openAuthModal('login'); 
        }
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={handleClose} title="Forgot Password">
            <div className="relative bg-white rounded-lg p-6 sm:p-8 max-w-md w-full mx-auto">
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close modal"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Forgot Password?</h2>
                <p className="text-sm text-gray-600 mb-6 text-center">
                    Enter your email address and we'll send you a link to reset it.
                </p>

                {message && (
                    <div className="mb-4 bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" /> <span>{message}</span>
                    </div>
                )}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                        <ExclamationCircleIcon className="h-5 w-5" /> <span>{error}</span>
                    </div>
                )}

                {!message && ( // Only show form if no success message
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email Address"
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="you@example.com"
                        />
                        <div>
                            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-sm text-center">
                    <button
                        type="button"
                        onClick={switchToLogin}
                        className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                        disabled={isLoading}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ForgotPasswordModal;