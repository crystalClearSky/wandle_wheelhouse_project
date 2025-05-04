import React, { useState, FormEvent } from 'react';
import Modal from '../components/ui/Modal'; // Our reusable Modal
import Input from '../components/ui/Input';   // Our reusable Input
import Button from '../components/ui/Button'; // Our reusable Button
import { useAuth } from '../contexts/AuthContext'; // Hook to access auth context
import AuthService from '../services/AuthService'; // API service

interface LoginModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  // Optional: Callback to open the register modal if needed
  onSwitchToRegister?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onRequestClose, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth(); // Get login function from context

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); // Prevent standard form submission
    setIsLoading(true);
    setError(null);

    try {
      const loginDto = { email, password };
      const response = await AuthService.login(loginDto); // Call API via service

      // AuthService should throw if response.data.isSuccess is false
      // or token/userInfo are missing
      if (response.token && response.userInfo) {
        login(response.token, response.userInfo); // Update global auth state
        onRequestClose(); // Close modal on successful login
        // Clear form fields (optional, as modal closes)
        setEmail('');
        setPassword('');
      } else {
         // Should ideally be caught by the catch block due to error thrown in service
         setError(response.message || "Login failed: Unexpected response.");
      }

    } catch (err: unknown) { // <--- Change to unknown
        let message = 'An unexpected error occurred during login.';
        // The error thrown by AuthService should now be a standard Error
        if (err instanceof Error) {
            message = err.message;
        } else if (typeof err === 'string') {
            message = err;
        }
        // Optionally, check for AxiosError again if AuthService might rethrow differently
        // else if (axios.isAxiosError(err)) {
        //    message = err.response?.data?.message || err.message || message;
        // }
        setError(message);
      } finally {
        setIsLoading(false);
      }
  };

  // Close modal and clear state
  const handleClose = () => {
      setError(null);
      setIsLoading(false);
      setEmail('');
      setPassword('');
      onRequestClose();
  }

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} title="Login">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
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
        <div className="mt-6 flex flex-col items-center">
          <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
           {/* Optional Links */}
           <div className="text-sm mt-4 text-center">
               {/* <a href="/forgot-password" onClick={(e)=>{e.preventDefault(); alert('Forgot password clicked!')}} className="font-medium text-blue-600 hover:text-blue-500">
                   Forgot password?
               </a> */}
               {onSwitchToRegister && (
                   <p className="mt-1">
                       Don't have an account?{' '}
                       <button type="button" onClick={onSwitchToRegister} className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none">
                           Register here
                       </button>
                   </p>
               )}
           </div>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;