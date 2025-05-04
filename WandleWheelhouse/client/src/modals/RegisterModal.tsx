import React, { useState, FormEvent } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthService from '../services/AuthService';
import { RegisterDto } from '../dto/Auth/RegisterDto';

interface RegisterModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  // Optional: Callback to open the login modal if needed
  onSwitchToLogin?: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onRequestClose, onSwitchToLogin }) => {
  // State for all form fields
  const [formData, setFormData] = useState<RegisterDto>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    // Initialize optional fields if you include them in the form
    // addressLine1: '', city: '', etc.
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
        ...prevState,
        [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 6) {
       setError("Password must be at least 6 characters long.");
       setIsLoading(false);
       return;
    }
    // Add more client-side checks if desired (e.g., regex)

    try {
      const response = await AuthService.register(formData); // Call API

      if (response.isSuccess) {
          setSuccessMessage(response.message || "Registration successful! You can now log in.");
          // Clear form after a short delay, then potentially close or switch
          setTimeout(() => {
             // Reset form (consider abstracting into a reset function)
             setFormData({ firstName: '', lastName: '', email: '', password: '' });
             setConfirmPassword('');
             setError(null); // Clear error on success
             setIsLoading(false);
             // Decide UX: close modal or switch to login?
             // Option 1: Just close
             // onRequestClose();
             // Option 2: Switch to login (if provided)
             if (onSwitchToLogin) {
                onSwitchToLogin();
             } else {
                onRequestClose(); // Fallback to closing
             }
          }, 1500); // Show success message briefly
      } else {
          // Should be caught by catch block if service throws error
          setError(response.message || "Registration failed: Unexpected response.");
          setIsLoading(false);
      }

    } catch (err: unknown) { // <--- Change to unknown
        let message = 'An unexpected error occurred during registration.';
        if (err instanceof Error) {
            message = err.message;
        } else if (typeof err === 'string') {
            message = err;
        }
        // Optionally check for AxiosError
        // else if (axios.isAxiosError(err)) {
        //     message = err.response?.data?.message || err.message || message;
        // }
        setError(message);
      } finally {
        setIsLoading(false);
      }
  };

  const handleClose = () => {
      // Reset state on close
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
      setConfirmPassword('');
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
      onRequestClose();
  }

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} title="Register New Account">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        {/* Input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Input label="First Name" id="reg-firstName" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
            <Input label="Last Name" id="reg-lastName" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
        </div>
        <Input label="Email Address" id="reg-email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={isLoading} />
        <Input label="Password" id="reg-password" name="password" type="password" value={formData.password} onChange={handleChange} required disabled={isLoading} placeholder="Min 6 characters, mix case, number, symbol"/>
        <Input label="Confirm Password" id="reg-confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={(e)=> setConfirmPassword(e.target.value)} required disabled={isLoading} />

        {/* Add optional address fields here if needed */}

        <div className="mt-6 flex flex-col items-center">
          <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
          {onSwitchToLogin && (
              <p className="mt-4 text-sm">
                  Already have an account?{' '}
                  <button type="button" onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none">
                      Login here
                  </button>
              </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default RegisterModal;